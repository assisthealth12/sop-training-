import React, { useState, useEffect } from 'react';
import type { Chapter } from '../tables/ChaptersTable';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../ui/ToastConfirm';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chapter: Omit<Chapter, 'id'>) => Promise<void>;
  title: string;
  initialData?: Chapter | null;
}

const AddChapterModal: React.FC<AddChapterModalProps> = ({ isOpen, onClose, onSubmit, title, initialData }) => {
  const { showToast } = useToast();
  const [order, setOrder] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setOrder(initialData.order);
      setChapterTitle(initialData.title);
      setContent(initialData.content || '');
      setPdfUrl(initialData.pdfUrl || '');
      setYoutubeUrl(initialData.youtubeUrl || '');
    } else {
      setOrder(1); setChapterTitle(''); setContent(''); setPdfUrl(''); setYoutubeUrl('');
    }
    setPdfFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPdfUrl = pdfUrl;
      
      // Handle file upload if a file was selected
      if (pdfFile) {
        const storageRef = ref(storage, `pdfs/chapters/${Date.now()}_${pdfFile.name}`);
        const snapshot = await uploadBytes(storageRef, pdfFile);
        finalPdfUrl = await getDownloadURL(snapshot.ref);
      }

      await onSubmit({
        order: Number(order),
        title: chapterTitle,
        content,
        pdfUrl: finalPdfUrl || "",
        youtubeUrl: youtubeUrl || ""
      });
      onClose();
    } catch (error) {
      console.error(error);
      showToast('Error saving chapter. Make sure you have permission to upload.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Chapter' : title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Chapter Order</label>
              <input type="number" required min="1" value={order} onChange={e => setOrder(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Chapter Title</label>
              <input type="text" required value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="Enter chapter title" />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Enter chapter content..." />
            </div>
            <div className="form-group">
              <label>Training Material (PDF) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="url" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="Paste external PDF link here..." />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>OR UPLOAD LOCAL FILE</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>

                <label style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '24px', 
                  border: '2px dashed var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-hover)', 
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={e => setPdfFile(e.target.files?.[0] || null)} 
                    style={{ display: 'none' }} 
                  />
                  {pdfFile ? (
                    <>
                      <i className="fas fa-file-pdf" style={{ fontSize: '28px', color: 'var(--danger)', marginBottom: '8px' }}></i>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{pdfFile.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Click to change file</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt" style={{ fontSize: '28px', color: 'var(--text-muted)', marginBottom: '8px' }}></i>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Click to select PDF</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>File will be securely uploaded to Firebase</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>YouTube URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span></label>
              <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <i className="fas fa-check"></i> {loading ? 'Saving...' : 'Save Chapter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddChapterModal;
