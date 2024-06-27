// src/components/ChannelView.tsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Url {
  id: string;
  url: string;
}

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [urls, setUrls] = useState<Url[]>([]);
  const [newUrl, setNewUrl] = useState('');

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

  return (
    <div>
      <h2>Channel: {id}</h2>
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
