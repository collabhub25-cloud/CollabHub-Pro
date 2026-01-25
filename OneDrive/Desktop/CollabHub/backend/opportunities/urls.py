"""
Opportunities App - URL Configuration
"""

from django.urls import path
from .views import (
    OpportunityListCreateView,
    OpportunityDetailView,
    MyOpportunitiesView,
    FeaturedOpportunitiesView,
    SavedOpportunitiesView,
    OpportunitySearchView
)

urlpatterns = [
    # Opportunity CRUD
    path('', OpportunityListCreateView.as_view(), name='opportunity_list'),
    path('<int:pk>/', OpportunityDetailView.as_view(), name='opportunity_detail'),
    
    # Special lists
    path('my/', MyOpportunitiesView.as_view(), name='my_opportunities'),
    path('featured/', FeaturedOpportunitiesView.as_view(), name='featured_opportunities'),
    path('search/', OpportunitySearchView.as_view(), name='opportunity_search'),
    
    # Saved opportunities
    path('saved/', SavedOpportunitiesView.as_view(), name='saved_opportunities'),
]
