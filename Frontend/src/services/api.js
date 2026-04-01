import axios from 'axios';
import { supabase } from '../config/supabaseClient';

class ApiService {
  constructor() {
    this.accessToken = null;
    this.api = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        this.accessToken = session?.access_token || null;
      })
      .catch(() => {
        this.accessToken = null;
      });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.accessToken = session?.access_token || null;
    });

    this.api.interceptors.request.use(async (config) => {
      let token = this.accessToken;

      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        this.accessToken = token;
      }

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    })
  }

  // Auth
  async getMyRole() {
    const { data } = await this.api.get('/auth/role/me');
    return data;
  }

  async hasRole(role) {
    const { data } = await this.api.get(`/auth/role/has/${role}`);
    return data.hasRole;
  }

  // Animation endpoints
  async getAllAnimations() {
    const { data } = await this.api.get('/animations/all');
    return data;
  }

  async getAnimation(id) {
    const { data } = await this.api.get(`/animations/${id}`);
    return data;
  }

  async addAnimation(animation) {
    const { data } = await this.api.post('/animations/add', animation);
    return data;
  }

  async updateAnimation(id, animation) {
    const { data } = await this.api.put(`/animations/${id}`, animation);
    return data;
  }

  async deleteAnimation(id) {
    await this.api.delete(`/animations/${id}`);
  }

  // Item endpoints
  async getAllItems() {
    const { data } = await this.api.get('/economy/all');
    return data;
  }

  async getItem(id) {
    const { data } = await this.api.get(`/economy/${id}`);
    return data;
  }

  async addItem(item) {
    const { data } = await this.api.post('/economy/add', item);
    return data;
  }

  async updateItem(id, item) {
    const { data } = await this.api.put(`/economy/${id}`, item);
    return data;
  }

  async deleteItem(id) {
    await this.api.delete(`/economy/${id}`);
  }

  // Purchase endpoints
  async createPurchase(lines) {
    const { data } = await this.api.post('/purchases/me', { lines });
    return data;
  }

  // Map endpoints
  async getAllMaps() {
    const { data } = await this.api.get('/maps/all');
    return data;
  }

  async getMap(id) {
    const { data } = await this.api.get(`/maps/${id}`);
    return data;
  }

  async addMap(map) {
    const { data } = await this.api.post('/maps/add', map);
    return data;
  }

  async getMyMapDrafts() {
    const { data } = await this.api.get('/maps/editor/drafts/me');
    return data;
  }

  async getMapDraft(draftId) {
    const { data } = await this.api.get(`/maps/editor/drafts/${draftId}`);
    return data;
  }

  async saveMapDraft(payload) {
    const { data } = await this.api.post('/maps/editor/drafts', payload);
    return data;
  }

  async submitMapDraft(draftId, payload = {}) {
    const { data } = await this.api.post(`/maps/editor/drafts/${draftId}/submit`, payload);
    return data;
  }

  // Backward-compatible alias.
  async publishMapDraft(draftId, payload = {}) {
    return this.submitMapDraft(draftId, payload);
  }

  async getMyMapSubmissions() {
    const { data } = await this.api.get('/maps/submissions/me');
    return data;
  }

  async getMapReviewQueue() {
    const { data } = await this.api.get('/maps/review/queue');
    return data;
  }

  async getApprovedUnpublishedMaps() {
    const { data } = await this.api.get('/maps/review/approved-unpublished');
    return data;
  }

  async approveMapSubmission(mapId) {
    const { data } = await this.api.put(`/maps/${mapId}/approve`);
    return data;
  }

  async rejectMapSubmission(mapId, reason) {
    const { data } = await this.api.put(`/maps/${mapId}/reject`, { reason });
    return data;
  }

  async publishApprovedMap(mapId, topicId) {
    const { data } = await this.api.put(`/maps/${mapId}/publish`, { topicId });
    return data;
  }

  async getEditorMapData(mapId) {
    const { data } = await this.api.get(`/maps/editor-data/${mapId}`);
    return data;
  }

  async setMapLike(mapId, liked) {
    const { data } = await this.api.put(`/maps/${mapId}/like`, { liked });
    return data;
  }

  async rateMap(mapId, rating) {
    const { data } = await this.api.put(`/maps/${mapId}/rating`, { rating });
    return data;
  }

  // Monster endpoints
  async getAllMonsters() {
    const { data } = await this.api.get('/monsters/all');
    return data;
  }

  async getMonster(id) {
    const { data } = await this.api.get(`/monsters/${id}`);
    return data;
  }

  async getMonstersByMap(id) {
    const {data} = await this.api.get(`/monsters/map/${id}`);
    return data;
  }

  async generateMonsterEncounterQuiz(payload) {
    const { data } = await this.api.post('/quizzes/monster-encounter', payload);
    return data;
  }

  async getEncounterState(mapId) {
    const { data } = await this.api.get(`/encounters/map/${mapId}/state`);
    return data;
  }

  async assignEncounterPair(mapId, npcId, monsterId) {
    const { data } = await this.api.put(`/encounters/map/${mapId}/pair`, { npcId, monsterId });
    return data;
  }

  async markEncounterNpcInteracted(mapId, npcId) {
    const { data } = await this.api.put(`/encounters/map/${mapId}/npc/${npcId}/interact`);
    return data;
  }

  async submitEncounterCombatResult(payload) {
    const { data } = await this.api.post('/encounters/combat/result', payload);
    return data;
  }

  async claimEncounterReward(mapId, monsterId) {
    const { data } = await this.api.post(`/encounters/map/${mapId}/monster/${monsterId}/claim`);
    return data;
  }

  async getSideChallengeByTheme(theme) {
    const { data } = await this.api.get(`/side-challenges/theme/${theme}`);
    return data;
  }

  async getEncounterTelemetryDashboard(mapId = null) {
    const { data } = await this.api.get('/encounters/telemetry/dashboard', {
      params: mapId ? { mapId } : {}
    });
    return data;
  }

  async addMonster(monster) {
    const { data } = await this.api.post('/monsters/add', monster);
    return data;
  }

  async updateMonster(id, monster) {
    const { data } = await this.api.put(`/monsters/${id}`, monster);
    return data;
  }

  async deleteMonster(id) {
    await this.api.delete(`/monsters/${id}`);
  }

  // NPC endpoints
  async getAllNPCs() {
    const { data } = await this.api.get('/npcs/all');
    return data;
  }

  async getNPC(id) {
    const { data } = await this.api.get(`/npcs/${id}`);
    return data;
  }

  async getNPCsByMap(id) {
    const { data } = await this.api.get(`/npcs/map/${id}`)
    return data;
  }

  async addNPC(npc) {
    const { data } = await this.api.post('/npcs/add', npc);
    return data;
  }

  async updateNPC(id, npc) {
    const { data } = await this.api.put(`/npcs/${id}`, npc);
    return data;
  }

  async deleteNPC(id) {
    await this.api.delete(`/npcs/${id}`);
  }

  // Learner endpoints
  async getAllLearners() {
    const { data } = await this.api.get('/learner/all');
    return data;
  }

  async getLearner(id) {
    const { data } = await this.api.get(`/learner/${id}`);
    return data;
  }

  async addLearner(learner) {
    const { data } = await this.api.post('/learner/add', learner);
    return data;
  }

  async updateLearner(id, learner) {
    const { data } = await this.api.put(`/learner/${id}`, learner);
    return data;
  }

  async getCurrentLearner() {
    const { data } = await this.api.get(`/learner/me`);
    return data;
  }

  async awardMyXp(xpAwarded = 0, goldAwarded = 0) {
    const { data } = await this.api.post('/learner/me/award-xp', {
      xpAwarded,
      goldAwarded
    });
    return data;
  }

  async getMyProfileState() {
    const { data } = await this.api.get('/learner/me/profile-state');
    return data;
  }

  async updateMyAvatarPreset(avatarPreset) {
    const { data } = await this.api.put('/learner/me/profile-state/avatar-preset', {
      avatarPreset
    });
    return data;
  }

  async recordDailyQuestEvent(eventType, amount = 1) {
    const { data } = await this.api.post('/learner/me/profile-state/daily-quests/events', {
      eventType,
      amount
    });
    return data;
  }

  async getMyAchievements() {
    const { data } = await this.api.get('/learner/me/achievements');
    return data;
  }

  async claimMyAchievement(achievementId) {
    const { data } = await this.api.post(`/learner/me/achievements/${achievementId}/claim`);
    return data;
  }

  async deleteLearner(id) {
    await this.api.delete(`/learner/${id}`);
  }

  // Friendship endpoints
  async searchFriends(query, limit = 8) {
    const { data } = await this.api.get('/learner/friends/search', {
      params: { query, limit }
    });
    return data;
  }

  async sendFriendRequest(targetLearnerId) {
    const { data } = await this.api.post('/learner/friends/requests', { targetLearnerId });
    return data;
  }

  async getIncomingFriendRequests() {
    const { data } = await this.api.get('/learner/friends/requests/incoming');
    return data;
  }

  async getOutgoingFriendRequests() {
    const { data } = await this.api.get('/learner/friends/requests/outgoing');
    return data;
  }

  async acceptFriendRequest(friendshipId) {
    const { data } = await this.api.post(`/learner/friends/requests/${friendshipId}/accept`);
    return data;
  }

  async declineFriendRequest(friendshipId) {
    const { data } = await this.api.post(`/learner/friends/requests/${friendshipId}/decline`);
    return data;
  }

  async cancelFriendRequest(friendshipId) {
    await this.api.delete(`/learner/friends/requests/${friendshipId}`);
  }

  async getFriendsList() {
    const { data } = await this.api.get('/learner/friends/list');
    return data;
  }

  async removeFriend(friendLearnerId) {
    await this.api.delete(`/learner/friends/list/${friendLearnerId}`);
  }

  // Chat endpoints
  async openFriendConversation(friendLearnerId) {
    const { data } = await this.api.post(`/learner/chat/friends/${friendLearnerId}/conversation`);
    return data;
  }

  async getChatConversations() {
    const { data } = await this.api.get('/learner/chat/conversations');
    return data;
  }

  async getConversationMessages(chatConversationId, before = null, limit = 30) {
    const params = { limit };
    if (before) params.before = before;
    const { data } = await this.api.get(`/learner/chat/conversations/${chatConversationId}/messages`, { params });
    return data;
  }

  async sendConversationMessage(chatConversationId, body) {
    const { data } = await this.api.post(`/learner/chat/conversations/${chatConversationId}/messages`, { body });
    return data;
  }

  async clearConversationMessages(chatConversationId) {
    await this.api.delete(`/learner/chat/conversations/${chatConversationId}/messages`);
  }

  async updateChatSettings(targetLearnerId, payload) {
    const { data } = await this.api.put(`/learner/chat/settings/${targetLearnerId}`, payload);
    return data;
  }

  // Learner Lesson
  async getMyLessonProgress() {
    const { data } = await this.api.get('/learner/progress/me');
    return data;
  }

  async enrollLessonProgress(progress) {
    const { data } = await this.api.put('/learner/progress/me/enroll', progress);
    return data;
  }

  async completeLessonProgress(progress) {
    const { data } = await this.api.put('/learner/progress/me/complete', progress);
    return data;
  }


  // Leaderboard endpoints
  async getLeaderboard(limit = 20) {
    const { data } = await this.api.get('/leaderboard', { params: { limit } });
    return data;
  }

  async getMyLeaderboardRank() {
    const { data } = await this.api.get('/leaderboard/me');
    return data;
  }


  // Inventory endpoints
  async getMyInventory() {
    const { data } = await this.api.get('/inventory/me');
    return data;
  }

  async addInventoryItem(itemId, quantity = 1, isEquipped = false) {
    const { data } = await this.api.post('/inventory/me/items', {
      itemId,
      quantity,
      isEquipped
    });
    return data; 
  }

  async removeInventoryItem(itemId, quantity = 1) {
    const { data } = await this.api.delete(`/inventory/me/items/${itemId}`, {
      params: { quantity }
    });
    return data; 
  }

  // Administrator endpoints
  async getAllAdministrators() {
    const { data } = await this.api.get('/administrators/all');
    return data;
  }

  async getAdministrator(id) {
    const { data } = await this.api.get(`/administrators/${id}`);
    return data;
  }

  async getAdministratorBySupabaseId(supabaseUserId) {
    const { data } = await this.api.get(`/administrators/supabase/${supabaseUserId}`);
    return data;
  }

  async isAdministrator(supabaseUserId) {
    const { data } = await this.api.get(`/administrators/check/${supabaseUserId}`);
    return data;
  }

  async createAdministrator(request) {
    const { data } = await this.api.post('/administrators/add', request);
    return data;
  }

  async updateAdministrator(id, request) {
    const { data } = await this.api.put(`/administrators/${id}`, request);
    return data;
  }

  async deleteAdministrator(id) {
    await this.api.delete(`/administrators/${id}`);
  }

  async deactivateAdministrator(id) {
    const { data } = await this.api.put(`/administrators/${id}/deactivate`);
    return data;
  }

  // Contributor endpoints
  async createContributor(contributor) { // async - handles request wihtout freezing app
    const { data } = await this.api.post('/contributors/add', contributor); // wait here will backend reponse
    return data;
  }

  async getAllContributors() {
    const { data } = await this.api.get('/contributors/all');
    return data;
  }

  async getContributor(id) {
    const { data } = await this.api.get(`/contributors/${id}`);
    return data;
  }

  async getContributorBySupabaseId(supabaseUserId) {
    const { data } = await this.api.get(`/contributors/supabase/${supabaseUserId}`);
    return data;
  }

  async isContributor(supabaseUserId) {
    const { data } = await this.api.get(`/contributors/check/${supabaseUserId}`);
    return data;
  }

  async updateContributor(id, contributor) {
    const { data } = await this.api.put(`/contributors/${id}`, contributor);
    return data;
  }

  async deleteContributor(id) {
    await this.api.delete(`/contributors/${id}`);
  }

  async deactivateContributor(id) {
    const { data } = await this.api.put(`/contributors/${id}/deactivate`);
    return data;
  }

  async getMyContributorAnalytics() {
    const { data } = await this.api.get('/contributors/analytics/me');
    return data;
  }

  // Topic endpoints
  async getAllTopics() {
    const { data } = await this.api.get('/topic/all');
    return data;
  }

  async getTopic(id) {
    const { data } = await this.api.get(`/topic/${id}`);
    return data;
  }

  async createTopic(topic) {
    const { data } = await this.api.post('/topic/add', topic);
    return data;
  }

  async updateTopic(id, topic) {
    const { data } = await this.api.put(`/topic/${id}`, topic);
    return data;
  }

  async deleteTopic(id) {
    await this.api.delete(`/topic/${id}`);
  }

  // AI endpoints
  async generateNarrations(topicId, title, description) {
    const { data } = await this.api.post('/ai/generate-narrations', { topicId, title, description });
    return data;
  }

  // Content endpoints
  async submitContent(content) {
    const { data } = await this.api.post('/contents', content);
    return data;
  }

  async getContentQueue() {
    const { data } = await this.api.get('/contents/queue');
    return data;
  }

  async getContent(id) {
    const { data } = await this.api.get(`/contents/${id}`);
    return data;
  }

  async getContentByContributor(contributorId) {
    const { data } = await this.api.get(`/contents/contributor/${contributorId}`);
    return data;
  }

  async getContentsByContributorId(contributorId) {
    return this.getContentByContributor(contributorId);
  }

  async getContentByTopic(topicId) {
    const { data } = await this.api.get(`/contents/topic/${topicId}`);
    return data;
  }

  async searchContent(keyword) {
    const { data } = await this.api.get('/contents/search', { params: { keyword } });
    return data;
  }

  async approveContent(id) {
    const { data } = await this.api.put(`/contents/${id}/approve`);
    return data;
  }

  async rejectContent(id) {
    const { data } = await this.api.put(`/contents/${id}/reject`);
    return data;
  }

  async getContentModeration(id) {
    const { data } = await this.api.get(`/contents/${id}/moderation`);
    return data;
  }

  async flagContent(contentId, payload) {
    const { data } = await this.api.post(`/contents/${contentId}/flags`, payload);
    return data;
  }

  async getOpenContentFlags() {
    const { data } = await this.api.get('/contents/flags');
    return data;
  }

  async getFlagsForContent(contentId) {
    const { data } = await this.api.get(`/contents/${contentId}/flags`);
    return data;
  }

  async reviewContentFlag(contentFlagId, payload) {
    const { data } = await this.api.put(`/contents/flags/${contentFlagId}/review`, payload);
    return data;
  }

  async getContentRating(contentId) {
    const { data } = await this.api.get(`/contents/${contentId}/rating`);
    return data;
  }

  async rateContent(contentId, rating) {
    const { data } = await this.api.put(`/contents/${contentId}/rating`, { rating });
    return data;
  }

  // Question Bank endpoints
  async generateBankDraft(mapId) {
    const { data } = await this.api.post(`/question-bank/map/${mapId}/generate`);
    return data;
  }

  async saveBankQuestions(mapId, questions) {
    const { data } = await this.api.post(`/question-bank/map/${mapId}`, questions);
    return data;
  }

  async getAllBankQuestions() {
    const { data } = await this.api.get('/question-bank/all');
    return data;
  }

  async getBankQuestionsByMap(mapId) {
    const { data } = await this.api.get(`/question-bank/map/${mapId}`);
    return data;
  }

  async approveBankQuestion(bankQuestionId) {
    const { data } = await this.api.put(`/question-bank/${bankQuestionId}/approve`);
    return data;
  }

  async rejectBankQuestion(bankQuestionId) {
    const { data } = await this.api.put(`/question-bank/${bankQuestionId}/reject`);
    return data;
  }

  async addBankQuestionToQuiz(quizId, bankQuestionId) {
    await this.api.post(`/question-bank/into-quiz/${quizId}/${bankQuestionId}`);
  }

  // Map Quiz (Admin) endpoints
  async createQuiz(quizData) {
    const { data } = await this.api.post('/map-quizzes', quizData);
    return data;
  }

  async getQuizForAdmin(mapId) {
    const { data } = await this.api.get(`/map-quizzes/map/${mapId}/admin`);
    return data;
  }

  async getQuizForLearner(mapId) {
    const { data } = await this.api.get(`/map-quizzes/map/${mapId}`);
    return data;
  }

  async submitMapQuizAttempt(quizId, answers) {
    const { data } = await this.api.post('/map-quizzes/submit', { quizId, answers }, { timeout: 15000 });
    return data;
  }

  async publishQuiz(quizId) {
    const { data } = await this.api.put(`/map-quizzes/${quizId}/publish`);
    return data;
  }

  async unpublishQuiz(quizId) {
    const { data } = await this.api.put(`/map-quizzes/${quizId}/unpublish`);
    return data;
  }

  async removeQuizQuestion(quizId, questionId) {
    const { data } = await this.api.delete(`/map-quizzes/${quizId}/questions/${questionId}`);
    return data;
  }

  // Real-World Missions (Admin)
  async getAllMissions() {
    const { data } = await this.api.get('/missions');
    return data;
  }

  async createMission(missionData) {
    const { data } = await this.api.post('/missions', missionData);
    return data;
  }

  async setMissionActive(missionId, value) {
    const { data } = await this.api.patch(`/missions/${missionId}/active?value=${value}`);
    return data;
  }

  async getFlaggedReflections() {
    const { data } = await this.api.get('/missions/flagged');
    return data;
  }

  async reviewReflection(attemptId, approve, note) {
    const { data } = await this.api.post(`/missions/attempts/${attemptId}/review`, { approve, note });
    return data;
  }

  // Real-World Missions (Learner)
  async getDailyMissions() {
    const { data } = await this.api.get('/missions/daily');
    return data;
  }

  async submitReflection(missionId, reflection) {
    const { data } = await this.api.post(`/missions/${missionId}/reflect`, { reflection });
    return data;
  }

  // Chatbot
  async chatbotQuery(query, conversationId = null, maxChunks = null) {
    const { data } = await this.api.post('/chatbot/query', {
      query,
      conversation_id: conversationId,
      max_chunks: maxChunks
    });
    return data;
  }

  async chatbotClearHistory(conversationId) {
    const { data } = await this.api.post('/chatbot/clear-history', {
      conversation_id: conversationId
    });
    return data;
  }
}

export const apiService = new ApiService();
