import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel, Link } from '../types';

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkEmoji, setNewLinkEmoji] = useState('');
  const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(
    undefined
  );
  const { getChannel, getChannelLinks, addLink } = useChannels();

  useEffect(() => {
    const fetchChannelAndLinks = async () => {
      if (id) {
        const fetchedChannel = await getChannel(id);
        setChannel(fetchedChannel);
        const fetchedLinks = await getChannelLinks(id);
        setLinks(fetchedLinks);
        if (fetchedLinks.length > 0) {
          setLastTimestamp(fetchedLinks[fetchedLinks.length - 1].createdAt);
        }
      }
    };

    fetchChannelAndLinks();
  }, [id, getChannel, getChannelLinks]);

  const handleAddLink = async () => {
    if (id && newLinkUrl.trim()) {
      const newLink = await addLink(id, newLinkUrl, newLinkEmoji);
      setLinks((prevLinks) => [newLink, ...prevLinks]);
      setNewLinkUrl('');
      setNewLinkEmoji('');
    }
  };

  const loadMoreLinks = async () => {
    if (id && lastTimestamp) {
      const moreLinks = await getChannelLinks(id, 20, lastTimestamp);
      setLinks((prevLinks) => [...prevLinks, ...moreLinks]);
      if (moreLinks.length > 0) {
        setLastTimestamp(moreLinks[moreLinks.length - 1].createdAt);
      }
    }
  };

  if (!channel) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Channel: {channel.name}</h2>
      <p>{channel.description}</p>
      <RouterLink to="/">Back to Channels</RouterLink>
      <div>
        <input
          type="text"
          value={newLinkUrl}
          onChange={(e) => setNewLinkUrl(e.target.value)}
          placeholder="Enter a URL"
        />
        <input
          type="text"
          value={newLinkEmoji}
          onChange={(e) => setNewLinkEmoji(e.target.value)}
          placeholder="Enter an emoji (optional)"
          maxLength={2}
        />
        <button onClick={handleAddLink}>Add Link</button>
      </div>
      <ul>
        {links.map((link) => (
          <li key={link.id}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.emoji} {link.url}
            </a>
            <p>
              Added by: {link.username} at{' '}
              {new Date(link.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      {links.length >= 20 && <button onClick={loadMoreLinks}>Load More</button>}
    </div>
  );
};

export default ChannelView;
