// src/components/ChannelList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';

const ChannelList: React.FC = () => {
  // rename object to channels
  const { channelList: channels, setChannelList, addChannel } = useChannels();

  const [newChannelName, setNewChannelName] = useState('');

  const addChannelFromUI = () => {
    if (newChannelName.trim()) {
      addChannel(newChannelName);
      setNewChannelName('');
    }
  };

  const deleteChannel = (id: string) => {
    setChannelList(channels.filter((channel) => channel.id !== id));
  };

  return (
    <div>
      <h2>Channels</h2>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id}>
            <Link to={`/channel/${channel.id}`}>{channel.name}</Link>
            <button onClick={() => deleteChannel(channel.id)}>Delete</button>
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
        <button onClick={addChannelFromUI}>Add Channel</button>
      </div>
    </div>
  );
};

export default ChannelList;
