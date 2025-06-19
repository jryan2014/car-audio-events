import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  User, 
  Clock, 
  Save, 
  Star, 
  Volume2, 
  Settings, 
  Award,
  CheckCircle,
  AlertCircle,
  Music
} from 'lucide-react';

interface ScoringCriteria {
  sound_quality_score: number;
  sound_quality_notes: string;
  spl_score: number;
  spl_measurement: number;
  installation_score: number;
  installation_notes: string;
  presentation_score: number;
  presentation_notes: string;
  innovation_score: number;
  innovation_notes: string;
  overall_notes: string;
}

interface Registration {
  id: string;
  user_id: string;
  category: string;
  class: string;
  participant_name: string;
  audio_system_name: string;
  registration_notes: string;
}

interface Event {
  id: number;
  title: string;
  competition_type: string;
  judging_criteria: any;
  scoring_system: string;
}

const JudgeScoring: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [scores, setScores] = useState<ScoringCriteria>({
    sound_quality_score: 0,
    sound_quality_notes: '',
    spl_score: 0,
    spl_measurement: 0,
    installation_score: 0,
    installation_notes: '',
    presentation_score: 0,
    presentation_notes: '',
    innovation_score: 0,
    innovation_notes: '',
    overall_notes: ''
  });
  const [isJudge, setIsJudge] = useState(false);
  const [judgeInfo, setJudgeInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    checkJudgeStatus();
    loadCompetitionEvents();
  }, [user]);

  useEffect(() => {
    calculateTotalScore();
  }, [scores, selectedEvent]);

  const checkJudgeStatus = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('competition_judges')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (data && !error) {
      setIsJudge(true);
      setJudgeInfo(data);
    }
  };

  const loadCompetitionEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_competition', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (data && !error) {
      setEvents(data);
    }
  };

  const loadRegistrations = async (eventId: number) => {
    const { data, error } = await supabase
      .from('competition_registrations')
      .select(`
        *,
        profiles!inner(full_name, first_name, last_name),
        user_audio_systems(name)
      `)
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('category', { ascending: true });
    
    if (data && !error) {
      const formattedData = data.map(reg => ({
        id: reg.id,
        user_id: reg.user_id,
        category: reg.category,
        class: reg.class || 'N/A',
        participant_name: reg.profiles?.full_name || 
                         `${reg.profiles?.first_name || ''} ${reg.profiles?.last_name || ''}`.trim() ||
                         'Unknown Participant',
        audio_system_name: reg.user_audio_systems?.name || 'No System Listed',
        registration_notes: reg.registration_notes || ''
      }));
      setRegistrations(formattedData);
    }
  };

  const calculateTotalScore = () => {
    if (!selectedEvent?.judging_criteria) {
      const basicTotal = scores.sound_quality_score + scores.spl_score + 
                        scores.installation_score + scores.presentation_score + 
                        scores.innovation_score;
      setTotalScore(basicTotal);
      return;
    }

    const criteria = selectedEvent.judging_criteria;
    let weightedTotal = 0;

    if (criteria.sound_quality) {
      weightedTotal += (scores.sound_quality_score * criteria.sound_quality.weight) / 100;
    }
    if (criteria.installation) {
      weightedTotal += (scores.installation_score * criteria.installation.weight) / 100;
    }
    if (criteria.presentation) {
      weightedTotal += (scores.presentation_score * criteria.presentation.weight) / 100;
    }
    if (criteria.innovation) {
      weightedTotal += (scores.innovation_score * criteria.innovation.weight) / 100;
    }

    setTotalScore(weightedTotal);
  };

  const saveScoring = async () => {
    if (!selectedEvent || !selectedRegistration || !judgeInfo) return;
    
    setSaving(true);
    
    const scoringData = {
      event_id: selectedEvent.id,
      registration_id: selectedRegistration.id,
      judge_id: judgeInfo.id,
      category: selectedRegistration.category,
      class: selectedRegistration.class,
      ...scores,
      total_score: totalScore,
      is_final: true
    };

    const { error } = await supabase
      .from('scoring_sessions')
      .upsert(scoringData, {
        onConflict: 'registration_id,judge_id'
      });

    if (error) {
      console.error('Error saving scores:', error);
      alert('Error saving scores. Please try again.');
    } else {
      alert('Scores saved successfully!');
      // Reset form or move to next participant
      setSelectedRegistration(null);
      setScores({
        sound_quality_score: 0,
        sound_quality_notes: '',
        spl_score: 0,
        spl_measurement: 0,
        installation_score: 0,
        installation_notes: '',
        presentation_score: 0,
        presentation_notes: '',
        innovation_score: 0,
        innovation_notes: '',
        overall_notes: ''
      });
    }
    
    setSaving(false);
  };

  if (!isJudge) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Judge Access Required</h2>
          <p className="text-gray-300 mb-6">
            You need to be registered as a competition judge to access this scoring interface.
          </p>
          <p className="text-gray-400 text-sm">
            Please contact event administrators to request judge credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Trophy className="h-8 w-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Competition Scoring</h1>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Judge: {judgeInfo?.judge_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Level: {judgeInfo?.certification_level}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Session: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Selection */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Event</h3>
          <div className="space-y-3">
            {events.map(event => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  loadRegistrations(event.id);
                  setSelectedRegistration(null);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedEvent?.id === event.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-gray-400 capitalize">
                  {event.competition_type?.replace('_', ' ')} Competition
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Participant Selection */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Participant</h3>
          {selectedEvent ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {registrations.map(reg => (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegistration(reg)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedRegistration?.id === reg.id
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{reg.participant_name}</div>
                  <div className="text-sm text-gray-400">
                    {reg.category} - {reg.class}
                  </div>
                  <div className="text-xs text-gray-500">{reg.audio_system_name}</div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              Please select an event first
            </p>
          )}
        </div>

        {/* Scoring Panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Scoring</h3>
            <div className="text-2xl font-bold text-yellow-400">
              {totalScore.toFixed(1)}
            </div>
          </div>
          
          {selectedRegistration ? (
            <div className="space-y-4">
              {/* Sound Quality */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                  <Music className="h-4 w-4" />
                  <span>Sound Quality</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.sound_quality_score}
                  onChange={(e) => setScores({...scores, sound_quality_score: Number(e.target.value)})}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-400">{scores.sound_quality_score}/100</div>
                <textarea
                  placeholder="Notes..."
                  value={scores.sound_quality_notes}
                  onChange={(e) => setScores({...scores, sound_quality_notes: e.target.value})}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                  rows={2}
                />
              </div>

              {/* SPL Score */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                  <Volume2 className="h-4 w-4" />
                  <span>SPL Measurement</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      placeholder="dB"
                      value={scores.spl_measurement || ''}
                      onChange={(e) => setScores({...scores, spl_measurement: Number(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                    />
                    <div className="text-xs text-gray-400 mt-1">Measurement (dB)</div>
                  </div>
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.spl_score}
                      onChange={(e) => setScores({...scores, spl_score: Number(e.target.value)})}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">Score: {scores.spl_score}/100</div>
                  </div>
                </div>
              </div>

              {/* Installation */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                  <Settings className="h-4 w-4" />
                  <span>Installation</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.installation_score}
                  onChange={(e) => setScores({...scores, installation_score: Number(e.target.value)})}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-400">{scores.installation_score}/100</div>
                <textarea
                  placeholder="Installation notes..."
                  value={scores.installation_notes}
                  onChange={(e) => setScores({...scores, installation_notes: e.target.value})}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                  rows={2}
                />
              </div>

              {/* Presentation */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                  <Star className="h-4 w-4" />
                  <span>Presentation</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.presentation_score}
                  onChange={(e) => setScores({...scores, presentation_score: Number(e.target.value)})}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-400">{scores.presentation_score}/100</div>
                <textarea
                  placeholder="Presentation notes..."
                  value={scores.presentation_notes}
                  onChange={(e) => setScores({...scores, presentation_notes: e.target.value})}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                  rows={2}
                />
              </div>

              {/* Innovation */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                  <Award className="h-4 w-4" />
                  <span>Innovation</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.innovation_score}
                  onChange={(e) => setScores({...scores, innovation_score: Number(e.target.value)})}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-400">{scores.innovation_score}/100</div>
                <textarea
                  placeholder="Innovation notes..."
                  value={scores.innovation_notes}
                  onChange={(e) => setScores({...scores, innovation_notes: e.target.value})}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                  rows={2}
                />
              </div>

              {/* Overall Notes */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Overall Notes</label>
                <textarea
                  placeholder="Overall assessment and additional comments..."
                  value={scores.overall_notes}
                  onChange={(e) => setScores({...scores, overall_notes: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                  rows={3}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={saveScoring}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Scores</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              Please select a participant to begin scoring
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeScoring; 