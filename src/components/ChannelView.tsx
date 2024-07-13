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
  const { getChannel, getChannelLinks, addLink, deleteLink } = useChannels();

  useEffect(() => {
    const fetchChannelAndLinks = async () => {
      if (id) {
        const fetchedChannel = await getChannel(id);
        setChannel(fetchedChannel);
        const fetchedLinks = await getChannelLinks(id);
        setLinks(fetchedLinks);
      }
    };

    fetchChannelAndLinks();
  }, [id, getChannel, getChannelLinks]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id && newLinkUrl.trim()) {
      try {
        const newLink = await addLink(id, newLinkUrl, newLinkEmoji);
        setLinks((prevLinks) => [newLink, ...prevLinks]);
        setNewLinkUrl('');
        setNewLinkEmoji('');
      } catch (error) {
        console.error('Error adding link:', error);
      }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (await deleteLink(linkId)) {
      setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkId));
    } else {
      // Optionally, show an error message to the user
      console.error('Failed to delete link');
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
      <form onSubmit={handleAddLink}>
        <input
          type="text"
          value={newLinkUrl}
          onChange={(e) => setNewLinkUrl(e.target.value)}
          placeholder="Enter a URL"
          required
        />
        <input
          type="text"
          value={newLinkEmoji}
          onChange={(e) => setNewLinkEmoji(e.target.value)}
          placeholder="Enter an emoji (optional)"
          maxLength={2}
        />
        <button type="submit">Add Link</button>
      </form>
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
            <button onClick={() => handleDeleteLink(link.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelView;
