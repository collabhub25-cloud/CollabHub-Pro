import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, useNotificationStore } from '@/store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      theme: 'system',
      activeTab: 'dashboard',
      modalOpen: null,
    });
  });

  it('has correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.theme).toBe('system');
    expect(state.activeTab).toBe('dashboard');
    expect(state.modalOpen).toBeNull();
  });

  it('toggleSidebar flips sidebarOpen', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setSidebarOpen sets specific value', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setTheme updates theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');

    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('setActiveTab updates activeTab', () => {
    useUIStore.getState().setActiveTab('settings');
    expect(useUIStore.getState().activeTab).toBe('settings');
  });

  it('openModal and closeModal manage modal state', () => {
    useUIStore.getState().openModal('confirm-delete');
    expect(useUIStore.getState().modalOpen).toBe('confirm-delete');

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modalOpen).toBeNull();
  });
});

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('starts with empty notifications', () => {
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('addNotification adds a new notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: 'Test',
      message: 'Hello world',
      read: false,
    });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Test');
    expect(notifications[0].type).toBe('success');
    expect(notifications[0].id).toBeTruthy();
    expect(notifications[0].createdAt).toBeInstanceOf(Date);
  });

  it('addNotification prepends to the array', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'First',
      message: 'First notification',
      read: false,
    });
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: 'Second',
      message: 'Second notification',
      read: false,
    });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications[0].title).toBe('Second');
    expect(notifications[1].title).toBe('First');
  });

  it('caps at 50 notifications', () => {
    for (let i = 0; i < 55; i++) {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        read: false,
      });
    }

    expect(useNotificationStore.getState().notifications).toHaveLength(50);
  });

  it('removeNotification removes by id', () => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong',
      read: false,
    });

    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().removeNotification(id);

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('markAsRead marks a notification as read', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Unread',
      message: 'Mark me',
      read: false,
    });

    const id = useNotificationStore.getState().notifications[0].id;
    expect(useNotificationStore.getState().notifications[0].read).toBe(false);

    useNotificationStore.getState().markAsRead(id);
    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
  });

  it('clearAll removes all notifications', () => {
    for (let i = 0; i < 5; i++) {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: `N${i}`,
        message: 'msg',
        read: false,
      });
    }

    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
