import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { Channel } from '../../types';
import Form from '../common/Form';
import './ChannelList.css';

const ChannelList: React.FC = () => {
  const { channelList, addChannel, deleteChannel, updateChannel } =
    useChannels();
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  const handleAddChannel = (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      addChannel(channelName);
    }
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannelId(channel.id);
  };

  const handleUpdateChannel = (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim() && editingChannelId) {
      updateChannel(editingChannelId, channelName);
      setEditingChannelId(null);
    }
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
                  onClick={() => deleteChannel(channel.id)}
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
    </div>
  );
};

export default ChannelList;
