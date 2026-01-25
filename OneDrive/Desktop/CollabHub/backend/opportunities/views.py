"""
Opportunities App - Views
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import F

from .models import Opportunity, SavedOpportunity
from .serializers import (
    OpportunitySerializer,
    OpportunityListSerializer,
    OpportunityCreateSerializer,
    SavedOpportunitySerializer
)


class IsCreatorOrReadOnly(permissions.BasePermission):
    """Only allow creators to edit their opportunities."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by == request.user


class OpportunityListCreateView(generics.ListCreateAPIView):
    """
    GET: List all opportunities with filtering
    POST: Create a new opportunity
    """
    
    queryset = Opportunity.objects.select_related('created_by', 'startup').filter(
        status__in=['open', 'in_progress']
    )
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'status', 'difficulty', 'is_remote', 'is_featured']
    search_fields = ['title', 'description', 'organization', 'required_skills']
    ordering_fields = ['created_at', 'deadline', 'title', 'total_applications']
    ordering = ['-is_featured', '-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OpportunityCreateSerializer
        return OpportunityListSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class OpportunityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get opportunity details
    PUT/PATCH: Update opportunity (creator only)
    DELETE: Delete opportunity (creator only)
    """
    
    queryset = Opportunity.objects.select_related('created_by', 'startup')
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OpportunityCreateSerializer
        return OpportunitySerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        Opportunity.objects.filter(pk=instance.pk).update(total_views=F('total_views') + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyOpportunitiesView(generics.ListAPIView):
    """List opportunities created by current user."""
    
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Opportunity.objects.filter(created_by=self.request.user)


class FeaturedOpportunitiesView(generics.ListAPIView):
    """List featured opportunities."""
    
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Opportunity.objects.filter(
        is_featured=True,
        status='open'
    ).order_by('-created_at')[:10]


class SavedOpportunitiesView(APIView):
    """Manage saved/bookmarked opportunities."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get all saved opportunities."""
        saved = SavedOpportunity.objects.filter(
            user=request.user
        ).select_related('opportunity')
        serializer = SavedOpportunitySerializer(saved, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Save an opportunity."""
        opportunity_id = request.data.get('opportunity_id')
        
        try:
            opportunity = Opportunity.objects.get(id=opportunity_id)
        except Opportunity.DoesNotExist:
            return Response(
                {'error': 'Opportunity not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        saved, created = SavedOpportunity.objects.get_or_create(
            user=request.user,
            opportunity=opportunity
        )
        
        if created:
            return Response({'message': 'Opportunity saved'}, status=status.HTTP_201_CREATED)
        return Response({'message': 'Already saved'}, status=status.HTTP_200_OK)
    
    def delete(self, request):
        """Unsave an opportunity."""
        opportunity_id = request.data.get('opportunity_id')
        
        try:
            saved = SavedOpportunity.objects.get(
                user=request.user,
                opportunity_id=opportunity_id
            )
            saved.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SavedOpportunity.DoesNotExist:
            return Response(
                {'error': 'Not in saved list'},
                status=status.HTTP_404_NOT_FOUND
            )


class OpportunitySearchView(generics.ListAPIView):
    """
    Advanced search for opportunities.
    Supports filtering by multiple criteria.
    """
    
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Opportunity.objects.filter(status='open')
        
        # Filter by type
        opp_type = self.request.query_params.get('type')
        if opp_type:
            queryset = queryset.filter(type=opp_type)
        
        # Filter by skills (JSON field)
        skills = self.request.query_params.getlist('skills')
        if skills:
            for skill in skills:
                queryset = queryset.filter(required_skills__contains=skill)
        
        # Filter by remote
        is_remote = self.request.query_params.get('is_remote')
        if is_remote:
            queryset = queryset.filter(is_remote=is_remote.lower() == 'true')
        
        # Search query
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                models.Q(title__icontains=q) |
                models.Q(description__icontains=q) |
                models.Q(organization__icontains=q)
            )
        
        return queryset.order_by('-is_featured', '-created_at')
