import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import { Trophy, Star, ArrowLeft, Save, Users, Calendar } from 'lucide-react';

interface Competition {
  id: number;
  title: string;
  start_date: string;
  competition_type: string;
  competition_categories: string[];
  competition_classes: string[];
  status: string;
  registration_count: number;
          judging_criteria?: {
          [key: string]: {
            weight: number;
            max_score: number;
            description: string;
          }
        };
  max_participants_per_category?: number;
}

interface Judge {
  id: string;
  judge_name: string;
  certification_level: string;
  specializations: string[];
  is_active: boolean;
}

interface Participant {
  id: string;
  user_id: string;
  participant_name: string;
  category: string;
  class: string;
  registration_notes?: string;
}

interface Score {
  participant_id: string;
  criteria: string;
  score: number;
  notes?: string;
}

const CompetitionManagement: React.FC = () => {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<{ [key: string]: Score[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'competitions' | 'judges' | 'scoring'>('competitions');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [scoringMode, setScoringMode] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);

  useEffect(() => {
    fetchCompetitions();
    fetchJudges();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          competition_type,
          competition_categories,
          competition_classes,
          status,
          judging_criteria,
          max_participants_per_category
        `)
        .eq('is_competition', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Get registration counts for each competition
      const competitionsWithCounts = await Promise.all(
        data.map(async (comp) => {
          const { count } = await supabase
            .from('competition_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', comp.id)
            .eq('status', 'approved');

          return {
            ...comp,
            registration_count: count || 0
          };
        })
      );

      setCompetitions(competitionsWithCounts);
    } catch (err) {
      console.error('Error fetching competitions:', err);
      setError('Failed to load competitions');
    }
  };

  const fetchJudges = async () => {
    try {
      const { data, error } = await supabase
        .from('competition_judges')
        .select('*')
        .eq('is_active', true)
        .order('judge_name');

      if (error) throw error;
      setJudges(data || []);
    } catch (err) {
      console.error('Error fetching judges:', err);
      setError('Failed to load judges');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (competitionId: number) => {
    try {
      // First get the registrations
      const { data, error } = await supabase
        .from('competition_registrations')
        .select(`
          id,
          user_id,
          category,
          class,
          registration_notes
        `)
        .eq('event_id', competitionId)
        .eq('status', 'approved');

      if (error) throw error;

      // Then get user names for each registration
      const participantsWithNames = await Promise.all(
        (data || []).map(async (reg) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', reg.user_id)
            .single();

          return {
            id: reg.id,
            user_id: reg.user_id,
            participant_name: userData?.name || 'Unknown Participant',
            category: reg.category,
            class: reg.class,
            registration_notes: reg.registration_notes
          };
        })
      );

      setParticipants(participantsWithNames);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to load participants');
    }
  };

  const handleStartScoring = async (competition: Competition) => {
    setSelectedCompetition(competition);
    await fetchParticipants(competition.id);
    setScoringMode(true);
    setActiveTab('scoring');
  };

  const handleBackToCompetitions = () => {
    setScoringMode(false);
    setSelectedCompetition(null);
    setParticipants([]);
    setScores({});
    setActiveTab('competitions');
  };

  const updateScore = (participantId: string, criteria: string, score: number, notes?: string) => {
    setScores(prev => ({
      ...prev,
      [participantId]: [
        ...(prev[participantId] || []).filter(s => s.criteria !== criteria),
        { participant_id: participantId, criteria, score, notes }
      ]
    }));
  };

  const handleAssignJudge = (judgeId: string) => {
    const judge = judges.find(j => j.id === judgeId);
    if (judge) {
      setSelectedJudge(judge);
      setShowAssignModal(true);
    }
  };

  const assignJudgeToCompetition = async (competitionId: number) => {
    if (!selectedJudge || !user) return;

    try {
      const { data, error } = await supabase
        .from('judge_assignments')
        .insert({
          competition_id: competitionId,
          judge_id: selectedJudge.id,
          assigned_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('Judge is already assigned to this competition!');
        } else {
          throw error;
        }
      } else {
        const competition = competitions.find(c => c.id === competitionId);
        alert(`Judge "${selectedJudge.judge_name}" assigned to "${competition?.title}" successfully!`);
        setShowAssignModal(false);
        setSelectedJudge(null);
      }
    } catch (err) {
      console.error('Error assigning judge:', err);
      setError('Failed to assign judge');
    }
  };

  const saveScores = async () => {
    if (!selectedCompetition || !user) return;

    try {
      // Create a scoring session
      const { data: sessionData, error: sessionError } = await supabase
        .from('scoring_sessions')
        .insert({
          event_id: selectedCompetition.id,
          judge_id: user.id,
          session_name: `${selectedCompetition.title} - ${new Date().toLocaleDateString()}`,
          scoring_criteria: selectedCompetition.judging_criteria,
          created_by: user.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save all scores
      const allScores = Object.values(scores).flat().map(score => ({
        session_id: sessionData.id,
        participant_id: score.participant_id,
        criteria: score.criteria,
        score: score.score,
        notes: score.notes,
        judge_id: user.id
      }));

      if (allScores.length > 0) {
        const { error: scoresError } = await supabase
          .from('competition_scores')
          .insert(allScores);

        if (scoresError) throw scoresError;
      }

      alert('Scores saved successfully!');
      handleBackToCompetitions();
    } catch (err) {
      console.error('Error saving scores:', err);
      setError('Failed to save scores');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-electric-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading competition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Competition Management
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Manage competitions, judges, and scoring for car audio events
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('competitions')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 flex-1 ${
                activeTab === 'competitions'
                  ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Competitions ({competitions.length})
            </button>
            <button
              onClick={() => setActiveTab('judges')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 flex-1 ${
                activeTab === 'judges'
                  ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Judges ({judges.length})
            </button>
            <button
              onClick={() => setActiveTab('scoring')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 flex-1 ${
                activeTab === 'scoring'
                  ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Scoring Dashboard
            </button>
          </div>
        </div>

        {/* Competitions Tab */}
        {activeTab === 'competitions' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h3 className="text-lg font-medium text-white">Active Competitions</h3>
              <p className="mt-1 text-sm text-gray-400">
                Manage competition events and registration
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Competition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Registrations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {competitions.map((competition) => (
                    <tr key={competition.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {competition.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {competition.competition_categories?.join(', ')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(competition.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-electric-500/20 text-electric-400">
                          {competition.competition_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {competition.registration_count} participants
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          competition.status === 'published' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {competition.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-electric-400 hover:text-electric-300 mr-3 transition-colors">
                          View Details
                        </button>
                        <button 
                          onClick={() => handleStartScoring(competition)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                        >
                          Start Scoring
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {competitions.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-white">No competitions found</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Create a competition event to get started with scoring.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Judges Tab */}
        {activeTab === 'judges' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h3 className="text-lg font-medium text-white">Competition Judges</h3>
              <p className="mt-1 text-sm text-gray-400">
                Manage certified judges for competition scoring
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {judges.map((judge) => (
                <div key={judge.id} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-medium text-white">{judge.judge_name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      judge.certification_level === 'master' ? 'bg-purple-500/20 text-purple-400' :
                      judge.certification_level === 'certified' ? 'bg-green-500/20 text-green-400' :
                      'bg-electric-500/20 text-electric-400'
                    }`}>
                      {judge.certification_level}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mb-3">
                    <strong>Specializations:</strong> {judge.specializations?.join(', ')}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleAssignJudge(judge.id)}
                      className="flex-1 bg-electric-500/20 text-electric-400 border border-electric-500/30 px-3 py-1 rounded text-sm hover:bg-electric-500/30 transition-colors"
                    >
                      Assign to Competition
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scoring Dashboard Tab */}
        {activeTab === 'scoring' && (
          <div className="space-y-6">
            {scoringMode && selectedCompetition ? (
              <>
                {/* Scoring Header */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleBackToCompetitions}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold text-white flex items-center">
                          <Trophy className="h-6 w-6 text-electric-400 mr-2" />
                          {selectedCompetition.title}
                        </h2>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(selectedCompetition.start_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {participants.length} participants
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={saveScores}
                      className="bg-electric-500 hover:bg-electric-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Scores</span>
                    </button>
                  </div>
                </div>

                {/* Scoring Interface */}
                <div className="grid gap-6">
                  {participants.map((participant) => (
                    <div key={participant.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-white">{participant.participant_name}</h3>
                          <p className="text-sm text-gray-400">
                            {participant.category} - {participant.class}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-electric-400">
                            {scores[participant.id]?.reduce((total, score) => total + score.score, 0) || 0}
                          </div>
                          <div className="text-xs text-gray-400">Total Score</div>
                        </div>
                      </div>

                                             {/* Scoring Criteria */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {selectedCompetition.judging_criteria && Object.entries(selectedCompetition.judging_criteria).map(([criteria, details]) => {
                           const currentScore = scores[participant.id]?.find(s => s.criteria === criteria);
                           return (
                             <div key={criteria} className="bg-gray-700/30 rounded-lg p-4">
                               <div className="flex items-center justify-between mb-2">
                                 <h4 className="font-medium text-white capitalize">
                                   {criteria.replace(/_/g, ' ')}
                                 </h4>
                                 <span className="text-xs text-gray-400">
                                   Weight: {details.weight}% | Max: {details.max_score}
                                 </span>
                               </div>
                               <p className="text-xs text-gray-400 mb-3">{details.description}</p>
                               
                               {/* Star Rating */}
                               <div className="flex items-center space-x-1 mb-3">
                                 {[1, 2, 3, 4, 5].map((star) => {
                                   const isActive = (currentScore?.score || 0) >= star * 20;
                                   return (
                                     <button
                                       key={star}
                                       onClick={() => updateScore(participant.id, criteria, star * 20, currentScore?.notes)}
                                       className={`p-1 transition-colors ${
                                         isActive
                                           ? 'text-electric-400'
                                           : 'text-gray-600 hover:text-gray-400'
                                       }`}
                                     >
                                       <Star className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} />
                                     </button>
                                   );
                                 })}
                                 <span className="ml-2 text-sm text-gray-300">
                                   {currentScore?.score || 0}/100
                                 </span>
                               </div>

                               {/* Notes */}
                               <textarea
                                 placeholder="Add detailed feedback notes..."
                                 className="w-full bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-electric-500 focus:ring-1 focus:ring-electric-500"
                                 rows={3}
                                 value={currentScore?.notes || ''}
                                 onChange={(e) => {
                                   updateScore(participant.id, criteria, currentScore?.score || 0, e.target.value);
                                 }}
                               />
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700/50">
                  <h3 className="text-lg font-medium text-white">Scoring Dashboard</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Real-time competition scoring and results
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <Trophy className="mx-auto h-12 w-12 text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-white">Scoring Interface</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Select a competition from the Competitions tab to begin scoring.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Judge Assignment Modal */}
      {showAssignModal && selectedJudge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-lg max-w-md w-full mx-4 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">
              Assign Judge to Competition
            </h3>
            <p className="text-gray-300 mb-4">
              Assign <span className="text-electric-400 font-semibold">{selectedJudge.judge_name}</span> to which competition?
            </p>
            
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {competitions.map((competition) => (
                <button
                  key={competition.id}
                  onClick={() => assignJudgeToCompetition(competition.id)}
                  className="w-full text-left p-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <div className="font-semibold text-white">{competition.title}</div>
                  <div className="text-sm text-gray-400">{competition.competition_type} • {new Date(competition.start_date).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionManagement; 