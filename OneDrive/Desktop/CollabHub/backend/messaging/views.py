"""
Messaging App - Views
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationListSerializer,
    MessageSerializer,
    MessageCreateSerializer
)
from collaborations.models import Notification


class ConversationListView(generics.ListAPIView):
    """List all conversations for current user."""
    
    serializer_class = ConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages').order_by('-updated_at')


class ConversationDetailView(generics.RetrieveAPIView):
    """Get conversation details."""
    
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)


class StartConversationView(APIView):
    """Start a new conversation with a user."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        initial_message = request.data.get('message', '')
        
        if not recipient_id:
            return Response(
                {'error': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if recipient_id == request.user.id:
            return Response(
                {'error': 'Cannot start conversation with yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if conversation already exists
        existing = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=recipient_id
        ).first()
        
        if existing:
            serializer = ConversationSerializer(existing, context={'request': request})
            return Response(serializer.data)
        
        # Create new conversation
        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, recipient_id)
        
        # Add initial message if provided
        if initial_message:
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=initial_message
            )
            
            # Create notification
            Notification.objects.create(
                user_id=recipient_id,
                type=Notification.Type.MESSAGE,
                title='New Message',
                message=f'{request.user.get_full_name() or request.user.email} sent you a message',
                link=f'/messages/{conversation.id}',
                related_user=request.user
            )
        
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(generics.ListCreateAPIView):
    """
    GET: List messages in a conversation
    POST: Send a new message
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MessageCreateSerializer
        return MessageSerializer
    
    def get_queryset(self):
        conversation_id = self.kwargs['pk']
        # Verify user is participant
        conversation = Conversation.objects.filter(
            pk=conversation_id,
            participants=self.request.user
        ).first()
        
        if not conversation:
            return Message.objects.none()
        
        return Message.objects.filter(conversation=conversation).select_related('sender')
    
    def perform_create(self, serializer):
        conversation_id = self.kwargs['pk']
        conversation = Conversation.objects.get(pk=conversation_id)
        
        # Verify user is participant
        if not conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not a participant in this conversation")
        
        message = serializer.save(
            conversation=conversation,
            sender=self.request.user
        )
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        # Send notification to other participant(s)
        other_participants = conversation.participants.exclude(id=self.request.user.id)
        for participant in other_participants:
            Notification.objects.create(
                user=participant,
                type=Notification.Type.MESSAGE,
                title='New Message',
                message=f'{self.request.user.get_full_name() or self.request.user.email}: {message.content[:50]}',
                link=f'/messages/{conversation.id}',
                related_user=self.request.user
            )


class MarkMessagesReadView(APIView):
    """Mark messages in a conversation as read."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        conversation = Conversation.objects.filter(
            pk=pk,
            participants=request.user
        ).first()
        
        if not conversation:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark all unread messages from others as read
        Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(
            sender=request.user
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({'message': 'Messages marked as read'})


class UnreadMessagesCountView(APIView):
    """Get total count of unread messages."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False
        ).exclude(
            sender=request.user
        ).count()
        
        return Response({'count': count})
