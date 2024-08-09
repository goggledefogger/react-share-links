import React, { useState, useEffect } from 'react';
import { useAuthUser } from '../../hooks/useAuthUser';
import { useToast } from '../../contexts/ToastContext';
import { useChannels } from '../../hooks/useChannels';
import Form from '../common/Form';
import LoadingSpinner from '../common/LoadingSpinner';
import { UserProfile as UserProfileType } from '../../types';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, profile, updateUserProfile, loading, error } = useAuthUser();
  const { showToast } = useToast();
  const { channelList } = useChannels();
  const [isEditing, setIsEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfileType | null>(
    null
  );
  const [digestFrequency, setDigestFrequency] = useState<
    'daily' | 'weekly' | 'none'
  >('none');
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
      setDigestFrequency(profile.digestFrequency || 'none');
      setSubscribedChannels(profile.subscribedChannels || []);
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!localProfile) return;

    try {
      await updateUserProfile({
        ...localProfile,
        digestFrequency,
        subscribedChannels,
      });
      setIsEditing(false);
      showToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to update profile', type: 'error' });
    }
  };

  const handleFormSubmit = (formData: { [key: string]: string }) => {
    if (!localProfile) return;
    setLocalProfile({ ...localProfile, ...formData });
    handleSubmit();
  };

  const handleChannelToggle = (channelId: string) => {
    setSubscribedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (loading) {
    return (
      <div className="user-profile loading">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile error">
        <p>{error}</p>
      </div>
    );
  }

  if (!user || !localProfile) {
    return (
      <div className="user-profile error">
        <p>Error: Unable to load user profile. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {isEditing ? (
        <Form
          fields={[
            {
              name: 'username',
              type: 'text',
              placeholder: 'Username',
              required: true,
              defaultValue: localProfile.username,
            },
            {
              name: 'email',
              type: 'email',
              placeholder: 'Email',
              required: true,
              defaultValue: localProfile.email,
            },
          ]}
          onSubmit={handleFormSubmit}
          submitButtonText="Save Changes"
          submitButtonClass="btn btn-primary"
        />
      ) : (
        <div className="profile-info">
          <div>
            <p>
              <strong>Username:</strong> {localProfile.username}
            </p>
            <p>
              <strong>Email:</strong> {localProfile.email}
            </p>
          </div>
          <div className="button-group">
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className="btn btn-secondary">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      )}

      <div className="digest-preferences">
        <h3>Digest Preferences</h3>
        <select
          value={digestFrequency}
          onChange={(e) =>
            setDigestFrequency(e.target.value as 'daily' | 'weekly' | 'none')
          }>
          <option value="none">No digest</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </select>
      </div>

      <div className="subscribed-channels">
        <h3>Subscribed Channels</h3>
        <div className="channel-list">
          {channelList.map((channel) => (
            <label key={channel.id} className="channel-item">
              <input
                type="checkbox"
                checked={subscribedChannels.includes(channel.id)}
                onChange={() => handleChannelToggle(channel.id)}
              />
              <span>{channel.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="button-group">
        {!isEditing && (
          <button onClick={handleSubmit} className="btn btn-primary">
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
