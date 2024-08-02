import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { useAuthUser } from '../../hooks/useAuthUser';
import { Channel, Link } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Form from '../common/Form';
import EmojiPicker from 'emoji-picker-react';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatRelativeTime } from '../../utils/dateUtils';
import { FaUser, FaClock, FaLink, FaSmile, FaTrash } from 'react-icons/fa';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import './ChannelView.css';

const LINKS_PER_PAGE = 20;

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const {
    getChannel,
    getChannelLinks,
    addLink,
    deleteLink,
    addEmojiReaction,
    removeEmojiReaction,
  } = useChannels();
  const { showToast } = useToast();
  const { user } = useAuthUser();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    linkId: string | null;
  }>({
    isOpen: false,
    linkId: null,
  });
  const [lastVisible, setLastVisible] = useState<
    QueryDocumentSnapshot<Link> | undefined
  >(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({
    top: 0,
    left: 0,
  });
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChannelAndLinks = async () => {
      if (id) {
        const fetchedChannel = await getChannel(id);
        setChannel(fetchedChannel);
        const { links: fetchedLinks, lastVisible: lastVisibleDoc } =
          await getChannelLinks(id);
        setLinks(fetchedLinks);
        setLastVisible(lastVisibleDoc);
        setHasMore(fetchedLinks.length === LINKS_PER_PAGE);
      }
    };

    fetchChannelAndLinks();
  }, [id, getChannel, getChannelLinks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchLinks = async () => {
    if (id) {
      setIsLoadingMore(true);
      try {
        const result = await getChannelLinks(id, LINKS_PER_PAGE, lastVisible);
        setLinks((prevLinks) => {
          const existingIds = new Set(prevLinks.map((link) => link.id));
          const newUniqueLinks = result.links.filter(
            (link) => !existingIds.has(link.id)
          );
          return [...prevLinks, ...newUniqueLinks];
        });
        setLastVisible(
          result.lastVisible as QueryDocumentSnapshot<Link> | undefined
        );
        setHasMore(result.links.length === LINKS_PER_PAGE);
      } catch (error) {
        console.error('Error fetching links:', error);
        showToast({ message: 'Failed to load links', type: 'error' });
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const handleAddLink = async (formData: { [key: string]: string }) => {
    const { url } = formData;
    if (id && url.trim()) {
      try {
        const newLink = await addLink(id, url);
        setLinks((prevLinks) => [newLink, ...prevLinks]);
        showToast({ message: 'Link added successfully', type: 'success' });
      } catch (error) {
        console.error('Error adding link:', error);
        showToast({
          message:
            error instanceof Error ? error.message : 'Failed to add link',
          type: 'error',
        });
      }
    }
  };

  const handleDeleteClick = (linkId: string) => {
    const link = links.find((l) => l.id === linkId);
    if (link && link.userId === user?.uid) {
      setDeleteConfirmation({ isOpen: true, linkId });
    } else {
      showToast({
        message: "You don't have permission to delete this link",
        type: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.linkId) {
      try {
        await deleteLink(deleteConfirmation.linkId);
        setLinks((prevLinks) =>
          prevLinks.filter((link) => link.id !== deleteConfirmation.linkId)
        );
        showToast({ message: 'Link deleted successfully', type: 'success' });
      } catch (error) {
        console.error('Error deleting link:', error);
        showToast({
          message:
            error instanceof Error ? error.message : 'Failed to delete link',
          type: 'error',
        });
      }
      setDeleteConfirmation({ isOpen: false, linkId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, linkId: null });
  };

  const handleEmojiClick = async (
    linkId: string,
    emojiObject: { emoji: string }
  ) => {
    try {
      await addEmojiReaction(linkId, emojiObject.emoji, user?.uid);
      setLinks((prevLinks) =>
        prevLinks.map((link) =>
          link.id === linkId
            ? {
                ...link,
                reactions: [
                  ...(link.reactions || []),
                  { emoji: emojiObject.emoji, userId: user?.uid || '' },
                ],
              }
            : link
        )
      );
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error adding emoji reaction:', error);
      showToast({ message: 'Failed to add emoji reaction', type: 'error' });
    }
  };

  const handleEmojiRemove = async (linkId: string, emoji: string) => {
    try {
      await removeEmojiReaction(linkId, emoji, user?.uid);
      setLinks((prevLinks) =>
        prevLinks.map((link) =>
          link.id === linkId
            ? {
                ...link,
                reactions:
                  link.reactions?.filter(
                    (reaction) =>
                      !(
                        reaction.emoji === emoji &&
                        reaction.userId === user?.uid
                      )
                  ) || [],
              }
            : link
        )
      );
    } catch (error) {
      console.error('Error removing emoji reaction:', error);
      showToast({ message: 'Failed to remove emoji reaction', type: 'error' });
    }
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = (e: React.MouseEvent, url: string) => {
    if (!(e.target as HTMLElement).closest('.link-actions')) {
      handleLinkClick(url);
    }
  };

  const handleEmojiButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    linkId: string
  ) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;

    setEmojiPickerPosition({
      top: rect.bottom + scrollY,
      left: rect.left,
    });
    setShowEmojiPicker(linkId);
  };

  if (!channel) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="channel-view">
      <h2 className="channel-title">Channel: {channel?.name}</h2>
      <RouterLink to="/" className="back-link">
        Back to Channels
      </RouterLink>

      <div className="add-link-form">
        <h3>Add New Link</h3>
        <Form
          fields={[
            {
              name: 'url',
              type: 'text',
              placeholder: 'Enter a URL',
              required: true,
            },
          ]}
          onSubmit={handleAddLink}
          submitButtonText="Add Link"
          submitButtonClass="btn btn-primary"
        />
      </div>

      <ul className="link-list">
        {links.map((link) => (
          <li
            key={link.id}
            className="link-card"
            onClick={(e) => handleCardClick(e, link.url)}>
            <div className="link-card-header">
              <span className="link-url">
                <FaLink className="icon" /> {link.url}
              </span>
              <div className="link-actions">
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmojiButtonClick(e, link.id);
                  }}
                  title="Add Reaction">
                  <FaSmile />
                </button>
                {link.userId === user?.uid && (
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(link.id);
                    }}
                    title="Delete Link">
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
            {link.preview && (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-preview">
                {link.preview.image && (
                  <img
                    src={link.preview.image}
                    alt={link.preview.title || 'Link preview'}
                    className="link-thumbnail"
                  />
                )}
                <div className="link-metadata">
                  <h3 className="link-title">{link.preview.title}</h3>
                  <p className="link-description">{link.preview.description}</p>
                  {link.preview.favicon && (
                    <img
                      src={link.preview.favicon}
                      alt="Favicon"
                      className="link-favicon"
                    />
                  )}
                </div>
              </a>
            )}
            <div className="link-card-content">
              <div className="link-meta">
                <span className="link-author">
                  <FaUser className="icon" /> {link.username}
                </span>
                <span className="link-date">
                  <FaClock className="icon" />{' '}
                  {formatRelativeTime(link.createdAt)}
                </span>
              </div>
              <div className="link-reactions">
                {link.reactions &&
                  link.reactions.map((reaction, index) => (
                    <span
                      key={index}
                      className="reaction"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (reaction.userId === user?.uid) {
                          handleEmojiRemove(link.id, reaction.emoji);
                        }
                      }}
                      style={{
                        cursor:
                          reaction.userId === user?.uid ? 'pointer' : 'default',
                      }}>
                      {reaction.emoji}
                    </span>
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="emoji-picker-container"
          style={{
            position: 'absolute',
            top: `${emojiPickerPosition.top}px`,
            left: `${emojiPickerPosition.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}>
          <EmojiPicker
            onEmojiClick={(emojiObject) =>
              handleEmojiClick(showEmojiPicker, emojiObject)
            }
          />
        </div>
      )}

      {hasMore && (
        <button
          onClick={fetchLinks}
          className="btn btn-secondary load-more-btn"
          disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        message="Are you sure you want to delete this link?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ChannelView;
