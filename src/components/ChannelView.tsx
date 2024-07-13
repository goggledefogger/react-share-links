import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel } from '../types';

interface Url {
  id: string;
  url: string;
}

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [urls, setUrls] = useState<Url[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);
  const { getChannel } = useChannels();

  useEffect(() => {
    const fetchChannel = async () => {
      if (id) {
        const fetchedChannel = await getChannel(id);
        setChannel(fetchedChannel);
      }
    };

    fetchChannel();
  }, [id, getChannel]);

  const addUrl = () => {
    if (newUrl.trim()) {
      const newUrlItem: Url = {
        id: Date.now().toString(),
        url: newUrl.trim(),
      };
      setUrls([...urls, newUrlItem]);
      setNewUrl('');
    }
  };

  if (!channel) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Channel: {channel.name}</h2>
      <Link to="/">Back to Channels</Link>
      <ul>
        {urls.map((url) => (
          <li key={url.id}>
            <a href={url.url} target="_blank" rel="noopener noreferrer">
              {url.url}
            </a>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Enter a URL"
        />
        <button onClick={addUrl}>Add URL</button>
      </div>
    </div>
  );
};

export default ChannelView;
