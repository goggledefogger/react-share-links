// src/components/ChannelList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Channel {
  id: string;
  name: string;
}

const ChannelList: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([
    { id: '1', name: 'General' },
    { id: '2', name: 'Tech News' },
  ]);

  const [newChannelName, setNewChannelName] = useState('');

  const addChannel = () => {
    if (newChannelName.trim()) {
      const newChannel: Channel = {
        id: Date.now().toString(),
        name: newChannelName.trim(),
      };
      setChannels([...channels, newChannel]);
      setNewChannelName('');
    }
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter((channel) => channel.id !== id));
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
        <button onClick={addChannel}>Add Channel</button>
      </div>
    </div>
  );
};

export default ChannelList;
