import axios from 'axios';
import { supabase } from '../config/supabaseClient';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use(async (config) => {
      const {data: {session}} = await supabase.auth.getSession();
      if(session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
      return config;
    })
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

  async deleteLearner(id) {
    await this.api.delete(`/learner/${id}`);
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
    const { data } = await this.api.get('/administrators');
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
    const { data } = await this.api.post('/administrators', request);
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
}

export const apiService = new ApiService();
