import {NotificationService} from '../services/notificationService';
import notifee from '@notifee/react-native';

// Mock notifee
jest.mock('@notifee/react-native');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = NotificationService.getInstance();
  });

  it('should request permissions', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
      authorizationStatus: 1,
    });
    const granted = await notificationService.requestPermissions();
    expect(granted).toBe(true);
  });

  it('should create a channel', async () => {
    (notifee.createChannel as jest.Mock).mockResolvedValueOnce('test-channel');
    const channelId = await notificationService.createChannel();
    expect(channelId).toBe('test-channel');
  });

  it('should schedule a reminder', async () => {
    const mockDate = new Date('2024-03-20T10:00:00');
    (notifee.createTriggerNotification as jest.Mock).mockResolvedValueOnce(
      'test-id',
    );

    const notificationId = await notificationService.scheduleReminder(mockDate);
    expect(notificationId).toBe('test-id');
  });

  it('should cancel a reminder', async () => {
    (notifee.cancelTriggerNotification as jest.Mock).mockResolvedValueOnce(
      true,
    );
    const success = await notificationService.cancelReminder('test-id');
    expect(success).toBe(true);
  });

  it('should handle permission errors gracefully', async () => {
    (notifee.requestPermission as jest.Mock).mockRejectedValueOnce(
      new Error('Permission error'),
    );
    await expect(notificationService.requestPermissions()).rejects.toThrow(
      'Permission error',
    );
  });

  it('should handle channel creation errors gracefully', async () => {
    (notifee.createChannel as jest.Mock).mockRejectedValueOnce(
      new Error('Channel error'),
    );
    await expect(notificationService.createChannel()).rejects.toThrow(
      'Channel error',
    );
  });

  it('should maintain singleton instance', () => {
    const instance1 = NotificationService.getInstance();
    const instance2 = NotificationService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
