import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PackingItem } from './PackingItem';

// Mocking motion from framer-motion as it can interfere with tests
jest.mock('motion/react', () => ({
  motion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PackingItem Avatar Rendering', () => {
  const mockBaseItem = {
    id: 'item-1',
    name: 'T-shirt',
    quantity: 1,
    packed_count: 0,
    is_packed: false,
    owner_id: null,
    owner_display_name: null,
    group_tag: null,
    user_display_name: 'John Doe',
    user_avatar_url: null,
    owner_avatar_url: null,
  };

  const mockOnToggle = jest.fn();
  const mockOnIncrementPacked = jest.fn();
  const mockOnUpdateQuantity = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnClaim = jest.fn();
  const mockOnRelease = jest.fn();
  const mockCurrentUserId = 'user-123';

  // Helper to render the component with custom item properties
  const renderPackingItem = (itemProps = {}) => {
    const item = { ...mockBaseItem, ...itemProps };
    render(
      <PackingItem
        item={item as any} // Using 'as any' to bypass potential strict type checking for mock data
        onToggle={mockOnToggle}
        onIncrementPacked={mockOnIncrementPacked}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
        onClaim={mockOnClaim}
        onRelease={mockOnRelease}
        currentUserId={mockCurrentUserId}
      />
    );
    return item;
  };

  // Test case 1: Rendering with owner avatar URL
  test('should render owner avatar if owner_avatar_url is provided', () => {
    const ownerAvatarUrl = 'http://example.com/owner-avatar.jpg';
    const ownerDisplayName = 'Alice Smith';
    renderPackingItem({
      owner_id: 'owner-abc',
      owner_avatar_url: ownerAvatarUrl,
      owner_display_name: ownerDisplayName,
      user_display_name: 'John Doe', // Ensure this doesn't interfere
    });

    const avatarImage = screen.getByAltText(`${ownerDisplayName}'s avatar`);
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute('src', ownerAvatarUrl);
    expect(avatarImage).toHaveClass('rounded-full', 'object-cover');
    expect(screen.queryByText('J')).not.toBeInTheDocument(); // Ensure initials are not shown
  });

  // Test case 2: Rendering with user avatar URL (when no owner avatar)
  test('should render user avatar if user_avatar_url is provided and no owner avatar', () => {
    const userAvatarUrl = 'http://example.com/user-avatar.jpg';
    const userDisplayName = 'Jane Doe';
    renderPackingItem({
      owner_id: null, // No owner
      owner_avatar_url: null,
      owner_display_name: null,
      user_display_name: userDisplayName,
      user_avatar_url: userAvatarUrl,
    });

    const avatarImage = screen.getByAltText(`${userDisplayName}'s avatar`);
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute('src', userAvatarUrl);
    expect(avatarImage).toHaveClass('rounded-full', 'object-cover');
    expect(screen.queryByText('J')).not.toBeInTheDocument(); // Ensure initials are not shown
  });

  // Test case 3: Rendering with initials fallback (no avatar URLs)
  test('should render initials and background color if no avatar URLs are provided', () => {
    const userDisplayName = 'John Doe';
    renderPackingItem({
      owner_id: null,
      owner_avatar_url: null,
      owner_display_name: null,
      user_display_name: userDisplayName,
      user_avatar_url: null,
    });

    const initialsSpan = screen.getByText('J');
    expect(initialsSpan).toBeInTheDocument();
    expect(initialsSpan).toHaveClass('rounded-full', 'flex', 'items-center', 'justify-center', 'text-[10px]', 'font-semibold', 'text-white');
    // We can't easily test the exact computed background color without mocking stringToColor or using jest-dom's style matching which can be brittle.
    // We check that the span with the initial is rendered.
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); // Ensure no image is shown
  });

  // Test case 4: Fallback to initials when owner_id is present but owner_avatar_url is missing
  test('should fallback to initials if owner_id is present but owner_avatar_url is missing', () => {
    const userDisplayName = 'John Doe';
    renderPackingItem({
      owner_id: 'owner-abc',
      owner_avatar_url: null, // Missing owner avatar URL
      owner_display_name: 'Alice Smith',
      user_display_name: userDisplayName,
      user_avatar_url: null,
    });

    const initialsSpan = screen.getByText('J');
    expect(initialsSpan).toBeInTheDocument();
    expect(initialsSpan).toHaveClass('rounded-full', 'flex', 'items-center', 'justify-center', 'text-[10px]', 'font-semibold', 'text-white');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  // Test case 5: Fallback to initials when user_avatar_url is missing
  test('should fallback to initials if user_avatar_url is missing', () => {
    const userDisplayName = 'John Doe';
    renderPackingItem({
      owner_id: null,
      owner_avatar_url: null,
      owner_display_name: null,
      user_display_name: userDisplayName,
      user_avatar_url: null, // Missing user avatar URL
    });

    const initialsSpan = screen.getByText('J');
    expect(initialsSpan).toBeInTheDocument();
    expect(initialsSpan).toHaveClass('rounded-full', 'flex', 'items-center', 'justify-center', 'text-[10px]', 'font-semibold', 'text-white');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
