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
  const [localProfile, setLocalProfile] = useState<UserProfileType | null>(null);
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'none'>('none');
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
      setDigestFrequency(profile.digestFrequency || 'none');
      setSubscribedChannels(profile.subscribedChannels || []);
      setEmailNotifications(profile.emailNotifications);
    }
  }, [profile]);

  const handleProfileSubmit = async (formData: { [key: string]: string }) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, formData);
      setLocalProfile((prev) => ({ ...prev, ...formData } as UserProfileType));
      setIsEditing(false);
      showToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to update profile', type: 'error' });
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateUserProfile(user.uid, {
        digestFrequency,
        subscribedChannels,
        emailNotifications,
      });
      showToast({ message: 'Preferences updated successfully', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to update preferences', type: 'error' });
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setSubscribedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (loading) return <div className="user-profile loading"><LoadingSpinner size="large" /></div>;
  if (error) return <div className="user-profile error"><p>{error}</p></div>;
  if (!user || !localProfile) return <div className="user-profile error"><p>Error: Unable to load user profile. Please try again later.</p></div>;

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {isEditing ? (
        <Form
          fields={[
            { name: 'username', type: 'text', placeholder: 'Username', required: true, defaultValue: localProfile.username },
            { name: 'email', type: 'email', placeholder: 'Email', required: true, defaultValue: localProfile.email },
          ]}
          onSubmit={handleProfileSubmit}
          submitButtonText="Save Changes"
          submitButtonClass="btn btn-primary"
        />
      ) : (
        <div className="profile-info">
          <p><strong>Username:</strong> {localProfile.username}</p>
          <p><strong>Email:</strong> {localProfile.email}</p>
          <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
            Edit Profile
          </button>
        </div>
      )}

      <form onSubmit={handlePreferencesSubmit} className="preferences-form">
        <div className="digest-preferences">
          <h3>Digest Preferences</h3>
          <select
            id="digestFrequency"
            name="digestFrequency"
            value={digestFrequency}
            onChange={(e) => setDigestFrequency(e.target.value as 'daily' | 'weekly' | 'none')}
          >
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
                  id={`channel-${channel.id}`}
                  name={`channel-${channel.id}`}
                  checked={subscribedChannels.includes(channel.id)}
                  onChange={() => handleChannelToggle(channel.id)}
                />
                <span>{channel.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="email-notifications">
          <h3>Email Notifications</h3>
          <label>
            <input
              type="checkbox"
              id="emailNotifications"
              name="emailNotifications"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            Receive email notifications for new links in subscribed channels
          </label>
        </div>

        <button type="submit" className="btn btn-primary">
          Save Preferences
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
