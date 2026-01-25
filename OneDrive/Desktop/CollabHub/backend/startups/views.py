"""
Startups App - Views
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import F

from .models import Startup, StartupMember, StartupUpdate
from .serializers import (
    StartupSerializer,
    StartupListSerializer,
    StartupCreateSerializer,
    StartupMemberSerializer,
    StartupUpdateSerializer
)
from .permissions import IsFounderOrReadOnly


class StartupListCreateView(generics.ListCreateAPIView):
    """
    GET: List all startups with filtering
    POST: Create a new startup (founders only)
    """
    
    queryset = Startup.objects.select_related('founder').prefetch_related('members')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['stage', 'status', 'industry', 'is_remote']
    search_fields = ['name', 'tagline', 'description', 'industry']
    ordering_fields = ['created_at', 'name', 'team_size']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StartupCreateSerializer
        return StartupListSerializer
    
    def perform_create(self, serializer):
        startup = serializer.save(founder=self.request.user)
        # Add founder as a team member
        StartupMember.objects.create(
            startup=startup,
            user=self.request.user,
            role=StartupMember.Role.FOUNDER
        )


class StartupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get startup details
    PUT/PATCH: Update startup (founder only)
    DELETE: Delete startup (founder only)
    """
    
    queryset = Startup.objects.select_related('founder').prefetch_related('members__user')
    permission_classes = [permissions.IsAuthenticated, IsFounderOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StartupCreateSerializer
        return StartupSerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        Startup.objects.filter(pk=instance.pk).update(total_views=F('total_views') + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyStartupsView(generics.ListAPIView):
    """List startups where current user is founder or member."""
    
    serializer_class = StartupListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Get startups where user is founder or member
        return Startup.objects.filter(
            models.Q(founder=user) | models.Q(members__user=user)
        ).distinct().select_related('founder')


class StartupMemberView(APIView):
    """Manage startup team members."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        """Get all members of a startup."""
        startup = Startup.objects.get(pk=pk)
        members = StartupMember.objects.filter(startup=startup).select_related('user')
        serializer = StartupMemberSerializer(members, many=True)
        return Response(serializer.data)
    
    def post(self, request, pk):
        """Add a member to startup (founder only)."""
        startup = Startup.objects.get(pk=pk)
        
        if startup.founder != request.user:
            return Response(
                {'error': 'Only founders can add members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = StartupMemberSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(startup=startup)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Remove a member from startup (founder only)."""
        startup = Startup.objects.get(pk=pk)
        
        if startup.founder != request.user:
            return Response(
                {'error': 'Only founders can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        member_id = request.data.get('member_id')
        try:
            member = StartupMember.objects.get(id=member_id, startup=startup)
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except StartupMember.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class StartupUpdateView(generics.ListCreateAPIView):
    """List and create startup updates."""
    
    serializer_class = StartupUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        startup_id = self.kwargs['pk']
        return StartupUpdate.objects.filter(startup_id=startup_id)
    
    def perform_create(self, serializer):
        startup_id = self.kwargs['pk']
        startup = Startup.objects.get(pk=startup_id)
        
        # Verify user is founder or member
        if startup.founder != self.request.user and not startup.members.filter(user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only team members can post updates")
        
        serializer.save(startup=startup, author=self.request.user)
