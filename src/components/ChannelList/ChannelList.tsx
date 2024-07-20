import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { Channel } from '../../types';
import Form from '../common/Form';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import './ChannelList.css';

const ChannelList: React.FC = () => {
  const { channelList, addChannel, deleteChannel, updateChannel } =
    useChannels();
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    channelId: string | null;
  }>({
    isOpen: false,
    channelId: null,
  });
  const { showToast } = useToast();

  const handleAddChannel = async (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      // Check if a channel with this name already exists
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
        const newChannel = await addChannel(channelName);
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
      // Check if the new name is different from the current name
      const currentChannel = channelList.find(
        (channel) => channel.id === editingChannelId
      );
      if (currentChannel && currentChannel.name !== channelName.trim()) {
        // Check if another channel already has this name
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

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      <ul className="channel-items">
        {channelList.map((channel: Channel) => (
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
                <Link to={`/channel/${channel.id}`} className="channel-link">
                  {channel.name}
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEditChannel(channel)}
                  aria-label={`Edit ${channel.name} channel`}>
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteClick(channel.id)}
                  aria-label={`Delete ${channel.name} channel`}>
                  Delete
                </button>
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
