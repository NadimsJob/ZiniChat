'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { helpDocs, helpCategories, DocCategory, HelpArticle } from '@/data/helpDocs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, ChevronRight, BookOpen, AlertCircle, Coins, Hash } from 'lucide-react';
import * as Icons from 'lucide-react';

export default function HelpCenterPage() {
  const { language } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'all'>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  // Search Engine
  const filteredDocs = useMemo(() => {
    let docs = helpDocs;

    // Filter by Category
    if (selectedCategory !== 'all') {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(doc => {
        const titleMatch = doc.titleEn.toLowerCase().includes(q) || doc.titleBn.toLowerCase().includes(q);
        const tagMatch = doc.tags.some(t => t.toLowerCase().includes(q));
        const contentMatch = doc.contentEn.toLowerCase().includes(q) || doc.contentBn.toLowerCase().includes(q);
        return titleMatch || tagMatch || contentMatch;
      });
    }

    return docs;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500 min-h-[85vh]">
      
      {/* Header & Search */}
      <div className="bg-surface border border-surface-hover rounded-2xl p-6 shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            {language === 'en' ? 'How can we help you today?' : 'আমরা আপনাকে কীভাবে সাহায্য করতে পারি?'}
          </h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedArticle(null); // Return to list view on search
              }}
              placeholder={language === 'en' ? 'Search features, keywords, or questions...' : 'ফিচার বা প্রশ্ন লিখে সার্চ করুন...'}
              className="w-full bg-background border border-surface-hover rounded-full pl-12 pr-6 py-4 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Categories */}
        <div className="lg:col-span-1 space-y-2 hidden md:block">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            {language === 'en' ? 'Categories' : 'ক্যাটাগরি'}
          </h3>
          
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedArticle(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              selectedCategory === 'all' 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'hover:bg-surface-hover text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>{language === 'en' ? 'All Articles' : 'সকল আর্টিকেল'}</span>
          </button>

          {helpCategories.map(cat => {
            // @ts-ignore
            const Icon = Icons[cat.icon] || BookOpen;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSelectedArticle(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  selectedCategory === cat.id 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{cat.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          
          {selectedArticle ? (
            /* Article Detail View */
            <div className="bg-surface border border-surface-hover rounded-2xl p-6 md:p-8 shadow-sm">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="text-primary hover:underline text-sm font-medium mb-6 inline-flex items-center gap-1"
              >
                ← {language === 'en' ? 'Back to search' : 'সার্চে ফিরে যান'}
              </button>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                {selectedArticle.titleEn}
              </h1>

              {/* Badges / Metadata */}
              <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b border-surface-hover">
                <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                  <span>{selectedArticle.planConditions}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-indigo-500 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                  <Coins className="w-4 h-4" />
                  <span>{selectedArticle.aiCreditCost}</span>
                </div>
              </div>

              {/* Markdown Content */}
              <div className="prose prose-zinc dark:prose-invert prose-emerald max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({node, ...props}) => (
                      <div className="my-6 border border-surface-hover rounded-xl overflow-hidden shadow-md">
                        <img {...props} className="w-full h-auto object-cover m-0" alt={props.alt || 'Documentation Screenshot'} />
                      </div>
                    ),
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold text-foreground mt-8 mb-4 border-b border-surface-hover pb-2" {...props} />,
                    a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />
                  }}
                >
                  {selectedArticle.contentEn}
                </ReactMarkdown>
              </div>

              {/* Tags */}
              <div className="mt-12 pt-6 border-t border-surface-hover flex flex-wrap gap-2">
                {selectedArticle.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-surface-hover text-muted-foreground">
                    <Hash className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Articles List View */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {searchQuery 
                  ? (language === 'en' ? `Search Results (${filteredDocs.length})` : `সার্চ রেজাল্ট (${filteredDocs.length})`)
                  : (language === 'en' ? 'Browse Articles' : 'আর্টিকেল ব্রাউজ করুন')}
              </h2>
              
              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 bg-surface-hover/30 rounded-2xl border border-surface-hover border-dashed">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {language === 'en' ? 'No articles found matching your criteria.' : 'আপনার সার্চের সাথে মিল রয়েছে এমন কোনো আর্টিকেল পাওয়া যায়নি।'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedArticle(doc)}
                      className="bg-surface border border-surface-hover hover:border-primary/50 hover:bg-surface-hover p-5 rounded-2xl text-left transition-all group flex flex-col h-full"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-2 text-lg">
                          {doc.titleEn}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.excerptEn}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-surface-hover flex items-center justify-between text-xs text-muted-foreground">
                        <span className="bg-background px-2.5 py-1 rounded-md border border-surface-hover inline-flex items-center gap-1.5">
                          {/* @ts-ignore */}
                          {(() => {
                            const cat = helpCategories.find(c => c.id === doc.category);
                            if (!cat) return null;
                            const Icon = Icons[cat.icon as keyof typeof Icons] || BookOpen;
                            return (
                              <>
                                {/* @ts-ignore */}
                                <Icon className="w-3.5 h-3.5" />
                                {cat.labelEn}
                              </>
                            );
                          })()}
                        </span>
                        <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                          {language === 'en' ? 'Read' : 'পড়ুন'} <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
