import React, { useState, useEffect } from 'react';
import { BoardItemData, LinkPreviewData } from '../../types';

interface LinkItemProps {
  item: BoardItemData;
}

export const LinkItem: React.FC<LinkItemProps> = ({ item }) => {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(item.previewData || null);
  const [loading, setLoading] = useState(!item.previewData);

  useEffect(() => {
    if (item.previewData) {
      setPreviewData(item.previewData);
      setLoading(false);
      return;
    }

    const fetchPreviewData = async () => {
      try {
        setLoading(true);
        const url = item.content;
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        // Note: Fetching full link metadata (title, description, image) from the client-side
        // is often blocked by CORS policies. A proper implementation requires a backend proxy.
        // As a frontend-only solution, we will use a public favicon service for the image
        // and use the domain for the title.
        const preview: LinkPreviewData = {
          title: domain.charAt(0).toUpperCase() + domain.slice(1),
          description: `A link to ${domain}. Click to visit the website.`,
          image: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`,
          url: url
        };
        setPreviewData(preview);
      } catch (error) {
        console.error('Error creating link preview:', error);
        setPreviewData({
          title: 'Website Link',
          description: 'Click to visit this website',
          image: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(item.content)}&size=128`,
          url: item.content
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [item.content, item.previewData]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading preview...</p>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {item.content}
        </a>
      </div>
    );
  }

  return (
    <a href={item.content} target="_blank" rel="noopener noreferrer" className="link-preview w-full h-full flex flex-col no-underline">
      <img
        src={previewData.image}
        alt={previewData.title}
        className="link-preview-image"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://i.imgur.com/80idhS4.png'; // Fallback icon
        }}
      />
      <div className="link-preview-content flex-grow">
        <div className="link-preview-title">{previewData.title}</div>
        <div className="link-preview-description">{previewData.description}</div>
        <div className="link-preview-url">{previewData.url}</div>
      </div>
    </a>
  );
};