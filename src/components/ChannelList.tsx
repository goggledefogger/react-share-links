import React from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel } from '../types';
import Form from './common/Form';
import './ChannelList.css';

const ChannelList: React.FC = () => {
  const { channelList, addChannel, deleteChannel } = useChannels();

  const handleAddChannel = (formData: { [key: string]: string }) => {
    const { channelName } = formData;
    if (channelName.trim()) {
      addChannel(channelName);
    }
  };

  return (
    <div className="channel-list bg-surface shadow rounded p-4">
      <h2 className="text-primary">Channels</h2>
      <ul className="channel-items">
        {channelList.map((channel: Channel) => (
          <li
            key={channel.id}
            className="channel-item bg-surface shadow rounded p-4 m-4">
            <Link to={`/channel/${channel.id}`} className="channel-link">
              {channel.name}
            </Link>
            <button
              className="btn btn-danger"
              onClick={() => deleteChannel(channel.id)}
              aria-label={`Delete ${channel.name} channel`}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="add-channel-form bg-surface shadow rounded p-4">
        <h3 className="text-secondary">Add New Channel</h3>
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
