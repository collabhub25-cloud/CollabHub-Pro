"""
Dashboard Views for CollabHub
Provides dashboard statistics and data for authenticated users
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import User, Profile, UserSkill
from startups.models import Startup, StartupMember
from opportunities.models import Opportunity
from collaborations.models import Application, Connection


class DashboardStatsView(APIView):
    """
    Get dashboard statistics for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get application statistics
        applications = Application.objects.filter(applicant=user)
        total_applications = applications.count()
        accepted_applications = applications.filter(status='accepted').count()
        pending_applications = applications.filter(
            status__in=['pending', 'reviewing', 'shortlisted']
        ).count()
        
        # Get team memberships
        team_memberships = StartupMember.objects.filter(user=user).count()
        
        # Get connections
        connections = Connection.objects.filter(
            Q(requester=user) | Q(receiver=user),
            status='accepted'
        ).count()
        
        # Calculate profile completion percentage
        profile_completion = self.calculate_profile_completion(user)
        
        # Get recent interactions (applications in last 30 days)
        recent_interactions = applications.filter(
            applied_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Get matches/recommendations count (based on skills)
        matches_count = self.get_matches_count(user)
        
        return Response({
            'interests_sent': recent_interactions,
            'active_teams': team_memberships,
            'matches_found': matches_count,
            'profile_completion': profile_completion,
            'stats': {
                'total_applications': total_applications,
                'accepted_applications': accepted_applications,
                'pending_applications': pending_applications,
                'connections': connections,
                'team_memberships': team_memberships
            }
        })
    
    def calculate_profile_completion(self, user):
        """Calculate profile completion percentage"""
        completion_score = 0
        total_fields = 10  # Total number of profile fields to check
        
        # Check user fields
        if user.first_name:
            completion_score += 1
        if user.last_name:
            completion_score += 1
        if user.email:
            completion_score += 1
        
        # Check profile fields
        try:
            profile = user.profile
            if profile.bio:
                completion_score += 1
            if profile.headline:
                completion_score += 1
            if profile.location:
                completion_score += 1
            if profile.github_url:
                completion_score += 1
            if profile.linkedin_url:
                completion_score += 1
            
            # Check if user has skills
            if UserSkill.objects.filter(user=user).exists():
                completion_score += 1
            
            # Check if user has avatar
            if profile.avatar:
                completion_score += 1
                
        except Profile.DoesNotExist:
            pass
        
        return round((completion_score / total_fields) * 100)
    
    def get_matches_count(self, user):
        """Get count of opportunities that match user's skills"""
        user_skills = UserSkill.objects.filter(user=user).values_list('skill__name', flat=True)
        
        if not user_skills:
            return 0
        
        # Count opportunities that require any of the user's skills
        matches = 0
        for skill in user_skills:
            matches += Opportunity.objects.filter(
                required_skills__contains=skill,
                status='open'
            ).count()
        
        return min(matches, 50)  # Cap at 50 for display purposes


class DashboardInteractionsView(APIView):
    """
    Get user's recent startup interactions and interests
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get recent applications with startup info
        recent_applications = Application.objects.filter(
            applicant=user
        ).select_related(
            'opportunity__startup', 'opportunity'
        ).order_by('-applied_at')[:10]
        
        interactions = []
        for app in recent_applications:
            startup_data = None
            if app.opportunity.startup:
                startup_data = {
                    'id': app.opportunity.startup.id,
                    'name': app.opportunity.startup.name,
                    'tagline': app.opportunity.startup.tagline,
                    'logo': app.opportunity.startup.logo,
                    'industry': app.opportunity.startup.industry,
                    'stage': app.opportunity.startup.stage
                }
            
            interactions.append({
                'id': app.id,
                'type': 'application',
                'opportunity': {
                    'id': app.opportunity.id,
                    'title': app.opportunity.title,
                    'type': app.opportunity.type
                },
                'startup': startup_data,
                'status': app.status,
                'date': app.applied_at,
                'interaction_type': 'Applied to opportunity'
            })
        
        return Response({
            'interactions': interactions
        })


class DashboardTeamsView(APIView):
    """
    Get user's team memberships and startups they're part of
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get team memberships
        memberships = StartupMember.objects.filter(
            user=user
        ).select_related('startup').order_by('-joined_at')
        
        teams = []
        for membership in memberships:
            startup = membership.startup
            teams.append({
                'id': startup.id,
                'name': startup.name,
                'tagline': startup.tagline,
                'logo': startup.logo,
                'industry': startup.industry,
                'stage': startup.stage,
                'status': startup.status,
                'role': membership.role,
                'title': membership.title,
                'joined_at': membership.joined_at,
                'team_size': startup.team_size,
                'is_founder': membership.role in ['founder', 'cofounder']
            })
        
        return Response({
            'teams': teams
        })


class DashboardRecommendationsView(APIView):
    """
    Get personalized recommendations based on user's skills and interests
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get user's skills
        user_skills = list(UserSkill.objects.filter(
            user=user
        ).values_list('skill__name', flat=True))
        
        recommendations = []
        
        if user_skills:
            # Find opportunities that match user's skills
            opportunities = Opportunity.objects.filter(
                status='open'
            ).exclude(
                # Exclude opportunities user has already applied to
                applications__applicant=user
            )[:20]
            
            for opp in opportunities:
                # Calculate skill match score
                opp_skills = opp.required_skills or []
                matching_skills = set(user_skills) & set(opp_skills)
                match_score = len(matching_skills) / max(len(opp_skills), 1) if opp_skills else 0
                
                if match_score > 0 or not opp_skills:  # Include opportunities with no specific skills
                    startup_data = None
                    if opp.startup:
                        startup_data = {
                            'id': opp.startup.id,
                            'name': opp.startup.name,
                            'logo': opp.startup.logo
                        }
                    
                    recommendations.append({
                        'id': opp.id,
                        'title': opp.title,
                        'type': opp.type,
                        'short_description': opp.short_description,
                        'required_skills': opp.required_skills,
                        'matching_skills': list(matching_skills),
                        'match_score': round(match_score * 100),
                        'deadline': opp.deadline,
                        'is_remote': opp.is_remote,
                        'location': opp.location,
                        'startup': startup_data,
                        'created_at': opp.created_at
                    })
            
            # Sort by match score and recency
            recommendations.sort(key=lambda x: (x['match_score'], x['created_at']), reverse=True)
            recommendations = recommendations[:10]  # Limit to top 10
        
        return Response({
            'recommendations': recommendations,
            'user_skills': user_skills
        })