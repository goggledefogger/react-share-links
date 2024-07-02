import { useState, useEffect } from 'react';
import { Channel } from '../types';

// hook that provides a way to access the state
function useChannels() {
  const localStorageChannelListKey = 'channels';

  const [channelList, setChannelList] = useState<Channel[]>([]);

  useEffect(() => {
    const channelListFromStorage = getChannelsFromStorage();
    setChannelList(channelListFromStorage);
  }, []);

  function getChannelsFromStorage() {
    const retrievedChannelListJson = localStorage.getItem(
      localStorageChannelListKey
    );
    if (!retrievedChannelListJson) {
      return [];
    }
    return JSON.parse(retrievedChannelListJson);
  }

  function addChannel(newChannelName: string) {
    // existing channel list
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelName.trim(),
    };
    // in the future call the API where the response includes the
    // new channel, for now use localStorage
    const updatedChannelList = [...channelList, newChannel];
    localStorage.setItem(
      localStorageChannelListKey,
      JSON.stringify(updatedChannelList)
    );

    setChannelList(updatedChannelList);
  }

  function deleteChannel(channelId: string) {
    const updatedChannelList = channelList.filter(
      (channel: Channel) => channel.id !== channelId
    );
    setChannelList(updatedChannelList);
  }

  function getChannel(channelId: string) {
    return getChannelsFromStorage().filter(
      (channel: Channel) => channel.id === channelId
    )[0];
  }

  return { channelList, setChannelList, addChannel, deleteChannel, getChannel };
}

export { useChannels };
