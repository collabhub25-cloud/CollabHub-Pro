"""
Messaging App - URL Configuration
"""

from django.urls import path
from .views import (
    ConversationListView,
    ConversationDetailView,
    StartConversationView,
    ConversationMessagesView,
    MarkMessagesReadView,
    UnreadMessagesCountView
)

urlpatterns = [
    # Conversations
    path('', ConversationListView.as_view(), name='conversation_list'),
    path('start/', StartConversationView.as_view(), name='start_conversation'),
    path('<int:pk>/', ConversationDetailView.as_view(), name='conversation_detail'),
    path('<int:pk>/messages/', ConversationMessagesView.as_view(), name='conversation_messages'),
    path('<int:pk>/read/', MarkMessagesReadView.as_view(), name='mark_read'),
    
    # Counts
    path('unread/', UnreadMessagesCountView.as_view(), name='unread_count'),
]
