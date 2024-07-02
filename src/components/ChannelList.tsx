// src/components/ChannelList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel } from '../types';

const ChannelList: React.FC = () => {
  // rename channelList to channels just to show how that works
  const { channelList: channels, addChannel, deleteChannel } = useChannels();

  const [newChannelName, setNewChannelName] = useState('');

  const addChannelToList = () => {
    if (newChannelName.trim()) {
      addChannel(newChannelName);
      setNewChannelName('');
    }
  };

  const deleteChannelFromList = (id: string) => {
    deleteChannel(id);
  };

  return (
    <div>
      <h2>Channels</h2>
      <ul>
        {channels.map((channel: Channel) => (
          <li key={channel.id}>
            <Link to={`/channel/${channel.id}`}>{channel.name}</Link>
            <button onClick={() => deleteChannelFromList(channel.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          placeholder="New channel name"
        />
        <button onClick={addChannelToList}>Add Channel</button>
      </div>
    </div>
  );
};

export default ChannelList;
