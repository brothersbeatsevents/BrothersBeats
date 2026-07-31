'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getMyPreferences, updateMyPreferences } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/site-config';

export default function PreferencesPage() {
  const { token } = useAuth();
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [cityPreference, setCityPreference] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyPreferences(token)
      .then((res) => {
        setMarketingConsent(!!res.data.marketing_consent);
        setCategories(res.data.category_preferences || []);
        setCityPreference(res.data.city_preference || '');
      })
      .finally(() => setLoading(false));
  }, [token]);

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateMyPreferences(
        { marketing_consent: marketingConsent, category_preferences: categories, city_preference: cityPreference },
        token,
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-8">Preferences</h1>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-md">
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="w-5 h-5 rounded border-bb-border text-bb-green focus:ring-bb-green"
            />
            <span className="text-sm text-bb-text">Email me about upcoming events and offers</span>
          </label>
        </div>

        <div>
          <p className="text-sm font-medium text-bb-text mb-2">Categories I&apos;m interested in</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => toggleCategory(key)}
                className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                  categories.includes(key)
                    ? 'bg-bb-green text-white border-bb-green'
                    : 'border-bb-border text-bb-text-secondary hover:border-bb-green'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Preferred city</label>
          <input
            value={cityPreference}
            onChange={(e) => setCityPreference(e.target.value)}
            placeholder="e.g. Dublin"
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>

        {saved && <p className="text-sm text-bb-green">Preferences saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </form>
    </div>
  );
}
