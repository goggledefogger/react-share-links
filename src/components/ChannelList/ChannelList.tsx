import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { useAuthUser } from '../../hooks/useAuthUser';
import { Channel } from '../../types';
import Form from '../common/Form';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FaUser,
  FaClock,
  FaHashtag,
  FaLink,
  FaEdit,
  FaTrash,
} from 'react-icons/fa';
import { formatRelativeTime } from '../../utils/dateUtils';
import './ChannelList.css';

const ChannelList: React.FC = () => {
  const navigate = useNavigate();
  const {
    channelList,
    loading,
    error,
    fetchChannels,
    addChannel,
    deleteChannel,
    updateChannel,
    getAllChannelLinkCounts,
    getUsernameById,
  } = useChannels();
  const { user, profile, loading: authLoading } = useAuthUser();
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    channelId: string | null;
  }>({
    isOpen: false,
    channelId: null,
  });
  const [linkCounts, setLinkCounts] = useState<{ [key: string]: number }>({});
  const { showToast } = useToast();
  const [creatorUsernames, setCreatorUsernames] = useState<{
    [key: string]: string;
  }>({});

  // Memoize channels to avoid recalculations
  const memoizedChannelList = useMemo(() => channelList, [channelList]);

  // Sort channels: subscribed channels first, then alphabetically
  const sortedChannels = useMemo(() => {
    return [...memoizedChannelList].sort((a, b) => {
      const aSubscribed = profile?.subscribedChannels?.includes(a.id) || false;
      const bSubscribed = profile?.subscribedChannels?.includes(b.id) || false;

      if (aSubscribed === bSubscribed) {
        return a.name.localeCompare(b.name);
      }
      return aSubscribed ? -1 : 1;
    });
  }, [memoizedChannelList, profile?.subscribedChannels]);

  const fetchLinkCounts = useCallback(async () => {
    try {
      const counts = await getAllChannelLinkCounts();
      setLinkCounts(counts);
    } catch (error) {
      console.error('Error fetching link counts:', error);
      showToast({ message: 'Failed to fetch link counts', type: 'error' });
    }
  }, [getAllChannelLinkCounts, showToast]);

  const fetchCreatorUsernames = useCallback(async () => {
    try {
      const usernames: { [key: string]: string } = {};
      for (const channel of memoizedChannelList) {
        usernames[channel.id] = await getUsernameById(channel.createdBy);
      }
      setCreatorUsernames(usernames);
    } catch (error) {
      console.error('Error fetching creator usernames:', error);
      showToast({
        message: 'Failed to fetch creator usernames',
        type: 'error',
      });
    }
  }, [memoizedChannelList, getUsernameById, showToast]);

  useEffect(() => {
    if (!loading && !error && memoizedChannelList.length > 0) {
      fetchLinkCounts();
      fetchCreatorUsernames();
    }
  }, [
    loading,
    error,
    memoizedChannelList,
    fetchLinkCounts,
    fetchCreatorUsernames,
  ]);

  const handleAddChannel = async (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      const channelExists = channelList.some(
        (channel: Channel) =>
          channel.name.toLowerCase() === channelName.trim().toLowerCase()
      );

      if (channelExists) {
        showToast({
          message: 'A channel with this name already exists',
          type: 'error',
        });
        return;
      }

      try {
        await addChannel(channelName);
        showToast({ message: 'Channel added successfully', type: 'success' });
      } catch (error) {
        console.error('Error adding channel:', error);
        showToast({ message: 'Failed to add channel', type: 'error' });
      }
    }
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannelId(channel.id);
  };

  const handleUpdateChannel = async (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim() && editingChannelId) {
      const currentChannel = channelList.find(
        (channel: Channel) => channel.id === editingChannelId
      );
      if (currentChannel && currentChannel.name !== channelName.trim()) {
        const channelExists = channelList.some(
          (channel: Channel) =>
            channel.id !== editingChannelId &&
            channel.name.toLowerCase() === channelName.trim().toLowerCase()
        );

        if (channelExists) {
          showToast({
            message: 'A channel with this name already exists',
            type: 'error',
          });
          return;
        }

        try {
          await updateChannel(editingChannelId, channelName);
          showToast({
            message: 'Channel updated successfully',
            type: 'success',
          });
        } catch (error) {
          console.error('Error updating channel:', error);
          showToast({ message: 'Failed to update channel', type: 'error' });
        }
      }
      setEditingChannelId(null);
    }
  };

  const handleDeleteClick = (channelId: string) => {
    setDeleteConfirmation({ isOpen: true, channelId });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.channelId) {
      try {
        await deleteChannel(deleteConfirmation.channelId);
        showToast({ message: 'Channel deleted successfully', type: 'success' });
      } catch (error) {
        console.error('Error deleting channel:', error);
        showToast({ message: 'Failed to delete channel', type: 'error' });
      }
      setDeleteConfirmation({ isOpen: false, channelId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, channelId: null });
  };

  const handleChannelClick = (channelId: string) => {
    navigate(`/channel/${channelId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading channels: {error}</p>
        <button onClick={fetchChannels} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <p>Please log in to view channels.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      <ul className="channel-items">
        {sortedChannels.map((channel: Channel) => (
          <li
            key={channel.id}
            className={`channel-item ${
              profile?.subscribedChannels?.includes(channel.id)
                ? 'subscribed'
                : ''
            }`}>
            {editingChannelId === channel.id ? (
              <Form
                fields={[
                  {
                    name: 'channelName',
                    type: 'text',
                    placeholder: 'Channel name',
                    required: true,
                    defaultValue: channel.name,
                  },
                ]}
                onSubmit={handleUpdateChannel}
                submitButtonText="Update"
              />
            ) : (
              <>
                <div
                  className="channel-info"
                  onClick={() => handleChannelClick(channel.id)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && handleChannelClick(channel.id)
                  }
                  role="button"
                  tabIndex={0}>
                  <div className="channel-header">
                    <span className="channel-name">
                      <FaHashtag className="icon" /> {channel.name}
                    </span>
                  </div>
                  <div className="channel-meta">
                    <span className="channel-creator">
                      <FaUser className="icon" />{' '}
                      {creatorUsernames[channel.id] || 'Loading...'}
                    </span>
                    <span className="channel-date">
                      <FaClock className="icon" />{' '}
                      {formatRelativeTime(channel.createdAt)}
                    </span>
                    <span className="channel-link-count">
                      <FaLink className="icon" />{' '}
                      {linkCounts[channel.id] !== undefined
                        ? linkCounts[channel.id]
                        : '...'}{' '}
                      links
                    </span>
                  </div>
                </div>
                {channel.createdBy === user?.uid && (
                  <div className="channel-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChannel(channel);
                      }}
                      title="Edit Channel">
                      <FaEdit />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(channel.id);
                      }}
                      title="Delete Channel">
                      <FaTrash />
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="add-channel-form">
        <h3>Add New Channel</h3>
        <Form
          fields={[
            {
              name: 'channelName',
              type: 'text',
              placeholder: 'New channel name',
              required: true,
            },
          ]}
          onSubmit={handleAddChannel}
          submitButtonText="Add Channel"
        />
      </div>
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        message="Are you sure you want to delete this channel?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ChannelList;
