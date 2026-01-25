"""
CollabHub Test Cases

Comprehensive tests for API endpoints, models, and permissions.
Run with: python manage.py test
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from users.models import User
from startups.models import Startup
from opportunities.models import Opportunity


class UserAuthenticationTests(APITestCase):
    """Test user registration and authentication."""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password2': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'talent'
        }
    
    def test_user_registration_success(self):
        """Test successful user registration."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='test@example.com').exists())
    
    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email fails."""
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login_success(self):
        """Test successful login returns tokens."""
        # First register
        self.client.post(self.register_url, self.user_data, format='json')
        
        # Then login
        login_data = {'email': 'test@example.com', 'password': 'TestPass123!'}
        response = self.client.post(self.login_url, login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_user_login_invalid_credentials(self):
        """Test login with wrong password fails."""
        self.client.post(self.register_url, self.user_data, format='json')
        
        login_data = {'email': 'test@example.com', 'password': 'WrongPassword'}
        response = self.client.post(self.login_url, login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StartupAPITests(APITestCase):
    """Test startup CRUD operations and permissions."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.founder = User.objects.create_user(
            username='founder',
            email='founder@example.com',
            password='TestPass123!',
            role='founder'
        )
        self.talent = User.objects.create_user(
            username='talent',
            email='talent@example.com',
            password='TestPass123!',
            role='talent'
        )
        
        self.startup_data = {
            'name': 'Test Startup',
            'description': 'A test startup for unit testing purposes.',
            'industry': 'Technology',
            'stage': 'idea'
        }
    
    def test_create_startup_as_founder(self):
        """Test founder can create startup."""
        self.client.force_authenticate(user=self.founder)
        response = self.client.post('/api/startups/', self.startup_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_list_startups(self):
        """Test listing startups."""
        self.client.force_authenticate(user=self.talent)
        
        # Create a startup first
        Startup.objects.create(
            name='Visible Startup',
            description='A visible startup',
            founder=self.founder,
            industry='Technology',
            stage='idea'
        )
        
        response = self.client.get('/api/startups/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_update_startup_by_non_founder_fails(self):
        """Test non-founder cannot update startup."""
        startup = Startup.objects.create(
            name='Test Startup',
            description='Test description',
            founder=self.founder,
            industry='Technology',
            stage='idea'
        )
        
        self.client.force_authenticate(user=self.talent)
        response = self.client.patch(f'/api/startups/{startup.id}/', {'name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OpportunityAPITests(APITestCase):
    """Test opportunity CRUD and filtering."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            role='founder'
        )
        
        self.opportunity = Opportunity.objects.create(
            title='Test Hackathon',
            type='hackathon',
            description='A test hackathon opportunity.',
            created_by=self.user,
            status='open'
        )
    
    def test_list_opportunities(self):
        """Test listing opportunities."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/opportunities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_filter_opportunities_by_type(self):
        """Test filtering opportunities by type."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/opportunities/?type=hackathon')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_search_opportunities(self):
        """Test searching opportunities."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/opportunities/?search=hackathon')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ApplicationAPITests(APITestCase):
    """Test application workflow."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.founder = User.objects.create_user(
            username='founder',
            email='founder@example.com',
            password='TestPass123!',
            role='founder'
        )
        self.applicant = User.objects.create_user(
            username='applicant',
            email='applicant@example.com',
            password='TestPass123!',
            role='talent'
        )
        
        self.opportunity = Opportunity.objects.create(
            title='Open Position',
            type='job',
            description='An open job position.',
            created_by=self.founder,
            status='open'
        )
    
    def test_apply_to_opportunity(self):
        """Test applying to an opportunity."""
        self.client.force_authenticate(user=self.applicant)
        response = self.client.post('/api/collaborations/applications/', {
            'opportunity': self.opportunity.id,
            'cover_letter': 'I would love to join!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_duplicate_application_fails(self):
        """Test duplicate application is prevented."""
        self.client.force_authenticate(user=self.applicant)
        
        # First application
        self.client.post('/api/collaborations/applications/', {
            'opportunity': self.opportunity.id,
            'cover_letter': 'First application'
        }, format='json')
        
        # Duplicate
        response = self.client.post('/api/collaborations/applications/', {
            'opportunity': self.opportunity.id,
            'cover_letter': 'Duplicate'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class InputValidationTests(APITestCase):
    """Test input validation."""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_registration_password_too_short(self):
        """Test password validation."""
        response = self.client.post('/api/auth/register/', {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123',
            'password2': '123',
            'role': 'talent'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_registration_invalid_email(self):
        """Test email validation."""
        response = self.client.post('/api/auth/register/', {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'TestPass123!',
            'password2': 'TestPass123!',
            'role': 'talent'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
