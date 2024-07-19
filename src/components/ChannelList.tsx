// src/components/ChannelList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel } from '../types';
import Form from './common/Form';
import './ChannelList.css';

const ChannelList: React.FC = () => {
  const { channelList: channels, addChannel, deleteChannel } = useChannels();

  const handleAddChannel = (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      addChannel(channelName);
    }
  };

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      <ul>
        {channels.map((channel: Channel) => (
          <li key={channel.id}>
            <Link to={`/channel/${channel.id}`}>{channel.name}</Link>
            <button
              className="btn btn-danger"
              onClick={() => deleteChannel(channel.id)}
              aria-label={`Delete ${channel.name} channel`}>
              Delete
            </button>
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
