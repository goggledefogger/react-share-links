import React, { useState, useEffect } from 'react';
import { useAuthUser } from '../../hooks/useAuthUser';
import { useToast } from '../../contexts/ToastContext';
import Form from '../common/Form';
import LoadingSpinner from '../common/LoadingSpinner';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, profile, updateUserProfile, loading, error } = useAuthUser();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleSubmit = async (formData: { [key: string]: string }) => {
    try {
      await updateUserProfile(formData);
      setIsEditing(false);
      showToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to update profile', type: 'error' });
    }
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
          onSubmit={handleSubmit}
          submitButtonText="Save Changes"
        />
      ) : (
        <div className="profile-info">
          <p>
            <strong>Username:</strong> {localProfile.username}
          </p>
          <p>
            <strong>Email:</strong> {localProfile.email}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary">
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
