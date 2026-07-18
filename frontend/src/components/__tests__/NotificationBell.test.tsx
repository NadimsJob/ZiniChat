import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationBell from '../NotificationBell';
import Cookies from 'js-cookie';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('js-cookie', () => ({
  get: jest.fn(),
}));

jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    io: jest.fn(() => mSocket),
  };
});

jest.mock('@/components/LanguageProvider', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

// Mock Audio to prevent test errors
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
}));

describe('NotificationBell Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/unread-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 2 }),
        });
      }
      if (url.includes('/notifications')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: '1', title: 'Test 1', message: 'Msg 1', type: 'info', isRead: false, createdAt: new Date().toISOString() },
            { id: '2', title: 'Test 2', message: 'Msg 2', type: 'info', isRead: true, createdAt: new Date().toISOString() }
          ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as jest.Mock;

    (Cookies.get as jest.Mock).mockReturnValue('fake_token');
  });

  it('matches snapshot', async () => {
    let container;
    await act(async () => {
      const result = render(<NotificationBell />);
      container = result.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders the bell icon and fetches notifications', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(io).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
  });

  it('opens dropdown when bell is clicked and displays notifications', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    
    // Dropdown should be closed initially
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    
    // Click bell
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });
    
    // Dropdown should open
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('Test 2')).toBeInTheDocument();
  });
});
