import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { Channel } from '../../types';
import Form from '../common/Form';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
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
    addChannel,
    deleteChannel,
    updateChannel,
    getAllChannelLinkCounts,
    getUsernameById,
  } = useChannels();
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
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [creatorUsernames, setCreatorUsernames] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const fetchLinkCounts = async () => {
      const counts = await getAllChannelLinkCounts();
      setLinkCounts(counts);
    };

    const fetchCreatorUsernames = async () => {
      const usernames: { [key: string]: string } = {};
      for (const channel of channelList) {
        usernames[channel.id] = await getUsernameById(channel.createdBy);
      }
      setCreatorUsernames(usernames);
    };

    fetchLinkCounts();
    fetchCreatorUsernames();
    setFilteredChannels(channelList);
  }, [getAllChannelLinkCounts, channelList, getUsernameById]);

  const handleAddChannel = async (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      const channelExists = channelList.some(
        (channel) =>
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
        (channel) => channel.id === editingChannelId
      );
      if (currentChannel && currentChannel.name !== channelName.trim()) {
        const channelExists = channelList.some(
          (channel) =>
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

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      <ul className="channel-items">
        {filteredChannels.map((channel: Channel) => (
          <li key={channel.id} className="channel-item">
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
