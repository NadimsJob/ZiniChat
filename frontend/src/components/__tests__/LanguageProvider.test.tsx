import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageProvider, useLanguage } from '../LanguageProvider';

// A mock consumer component to test the context
const TestConsumer = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="lang-display">{language}</span>
      <button onClick={() => setLanguage('bn')}>Set Bengali</button>
      <button onClick={() => setLanguage('en')}>Set English</button>
    </div>
  );
};

describe('LanguageProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it('provides default language "en"', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('lang-display')).toHaveTextContent('en');
  });

  it('updates language and saves to localStorage when setLanguage is called', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    // Initial state
    expect(screen.getByTestId('lang-display')).toHaveTextContent('en');

    // Change to Bengali
    fireEvent.click(screen.getByText('Set Bengali'));
    expect(screen.getByTestId('lang-display')).toHaveTextContent('bn');
    expect(window.localStorage.getItem('app-lang')).toBe('bn');

    // Change back to English
    fireEvent.click(screen.getByText('Set English'));
    expect(screen.getByTestId('lang-display')).toHaveTextContent('en');
    expect(window.localStorage.getItem('app-lang')).toBe('en');
  });

  it('loads language from localStorage on mount', () => {
    window.localStorage.setItem('app-lang', 'bn');

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    // Should read 'bn' from localStorage and set it
    expect(screen.getByTestId('lang-display')).toHaveTextContent('bn');
  });
});
