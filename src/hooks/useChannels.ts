import { useState } from 'react';
import { Channel } from '../types';

// hook that provides a way to access the state
function useChannels() {
  const [channelList, setChannelList] = useState<Channel[]>([]);

  // place all the logic to CRUD channels

  function addChannel(newChannelName: string) {
    // existing channel list
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelName.trim(),
    };
    // call the API

    // once i have the response, the response should be just the new channel
    setChannelList([...channelList, newChannel]);
  }

  function deleteChannel(newChannelName: string) {}

  return { channelList, setChannelList, addChannel, deleteChannel };
}

export { useChannels };
