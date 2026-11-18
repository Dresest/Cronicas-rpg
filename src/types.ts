export type Role = 'jugador' | 'dungeonMaster' | 'adminInformatico'
export type Tab = 'inicio' | 'atributos' | 'habilidades' | 'inventario' | 'misiones' | 'titulos' | 'conocimientos' | 'admin' | 'partida' | 'mas' | 'bandeja'

export interface Profile {
  id: string
  display_name: string
  role: Role
}
export interface Character {
  id: string
  owner_id: string
  name: string
  class_name: string
  species: string
  backstory: string
  portrait_key: string
  portrait_path: string|null
  base_damage_die: number
  xp: number
  pc: number
  created_at: string
}
export interface CharacterProficiency {
  character_id:string
  proficiency_bonus:number
  primary_attribute:string|null
  selected_skills:string[]
  secondary_class:string|null
  created_at:string
  updated_at:string
}
export interface CampaignUnlock {
  resource_name: 'NEM'|'Éter'
  unlocked: boolean
}
export interface Resource {
  id: string
  character_id: string
  name: string
  current_value: number
  max_value: number
  sort_order: number
}
export interface Attribute {
  character_id: string
  attribute_key: string
  base_score: number
  progress: number
}
export interface AttributeCost {
  attribute_key: string
  cost_pc: number
}
export interface Threshold {
  level: number
  min_xp: number
}
export interface Activity {
  id: string
  character_id: string | null
  actor_user_id: string
  actor_role: Role
  action: string
  details: Record<string, unknown>
  created_at: string
}
export interface PrivateActivity {
  action: string
  character_id: string | null
  actor_user_id: string
  actor_role: string
  details: Record<string, unknown>
  created_at: string
}

export interface Skill {
  id: string
  name: string
  description: string
  kind: 'activa'|'pasiva'
  purchase_pc: number | null
  upgrade_pc: number | null
  max_rank: number | null
  min_level: number
  resource_name: string|null
  resource_cost: number
  is_active: boolean
  is_visible: boolean
  is_requestable: boolean
  is_usable: boolean
  created_at: string
  updated_at: string
}
export type SkillDraft = Omit<Pick<Skill,'name'|'description'|'kind'|'purchase_pc'|'upgrade_pc'|'max_rank'|'min_level'|'resource_name'|'resource_cost'|'is_active'|'is_visible'|'is_requestable'|'is_usable'>,'purchase_pc'|'upgrade_pc'|'max_rank'> & {
  purchase_pc:number;upgrade_pc:number;max_rank:number
}
export interface PersonalSkillProposal {
  id:string;character_id:string;name:string;description:string
  kind:'activa'|'pasiva';purchase_pc:number;upgrade_pc:number;max_rank:number;min_level:number
  resource_name:string|null;resource_cost:number;status:'pendiente'|'aprobada'|'rechazada'
  approved_skill_id:string|null;created_at:string;resolved_at:string|null;reviewed_by:string|null
}

export interface SkillRequest {
  id:string;character_id:string;skill_id:string;note:string
  request_type:'aprender'|'mejorar';status:'pendiente'|'aprobada'|'rechazada';requested_at:string;resolved_at:string|null
}
export interface CharacterSkillAppearance {
  skill_id:string;name:string;description:string;resource_name:string|null;resource_cost:number
}
export interface DMSkillProgress {
  skill_id:string;invested_pc:number;target_pc:number;effective_max_rank:number
  name_override:string|null;description_override:string|null
  resource_name_override:string|null;resource_cost_override:number|null
  target_pc_override:number|null;max_rank_override:number|null
}
export interface CharacterSkill {
  character_id: string
  skill_id: string
  rank: number
  acquired_at: string
  updated_at: string
}

export type MissionStatus = 'propuesta'|'activa'|'rechazada'|'completada'|'archivada'
export type MissionVisibility = 'publica'|'grupal'|'individual'|'secreta'
export interface Mission {
  id: string; created_by: string; creator_character_id: string|null
  origin: 'dm'|'jugador'; title: string; description: string; visibility: MissionVisibility
  status: MissionStatus; created_at: string; updated_at: string
  closed_at: string|null; closing_note: string
}
export interface MissionParticipant {
  mission_id: string; character_id: string; reward_xp: number; reward_pc: number
  reward_extra: string; reward_copper:number; rewarded_at: string|null; assigned_at: string
}
export interface MissionObjective {
  id: string; mission_id: string; title: string; target_character_id: string|null
  sort_order: number; completed: boolean; claimed_by_character_id: string|null
  claimed_at: string|null; verified_at: string|null; created_at: string
}
export interface MissionJournalEntry {
  id: string; mission_id: string; character_id: string|null; author_user_id: string
  note: string; created_at: string
}
export interface MissionCompletionRequest {
  id: string; mission_id: string; character_id: string; status: 'pendiente'|'aprobada'|'rechazada'
  note: string; dm_note: string; created_at: string; resolved_at: string|null
}


// Inventario (v0.9). Los atributos efectivos se calculan en el servidor.
export type ItemCategory = 'arma'|'armadura'|'objeto'|'clave'
export type ItemRarity = 'comun'|'poco_comun'|'raro'|'epico'|'legendario'
export type ItemBonuses = Partial<Record<'Sabiduría'|'Carisma'|'Constitución'|'Destreza'|'Fuerza'|'Inteligencia',number>>
export interface ItemDefinition {
  id:string;name:string;description:string;category:ItemCategory;rarity:ItemRarity
  bonuses:ItemBonuses;passive_text:string;use_resource:string|null;restore_amount:number
  damage_bonus:number;damage_dice_count:number;damage_die_sides:number|null;equip_slot:string|null
  is_public:boolean;is_active:boolean;created_at:string;updated_at:string
}
export type ItemDraft=Pick<ItemDefinition,'name'|'description'|'category'|'rarity'|'bonuses'|'passive_text'|'use_resource'|'restore_amount'|'damage_bonus'|'damage_dice_count'|'damage_die_sides'|'equip_slot'|'is_public'|'is_active'>
export interface CharacterItem { character_id:string;item_id:string;quantity:number;equipped:boolean;acquired_at:string }
export interface CharacterWallet { character_id:string;copper:number;updated_at:string }
export interface EffectiveAttribute {attribute_key:string;base_score:number;equipment_bonus:number;total_score:number;achievement_bonus:number}
export interface MissionLoot { mission_id:string;character_id:string;item_id:string;quantity:number }

// Logros y títulos (v1.0).
export type AchievementCategory='logro'|'titulo'
export interface AchievementDefinition {
 id:string;name:string;description:string;category:AchievementCategory;
 rarity:ItemRarity;bonuses:ItemBonuses;per_rank_bonuses:ItemBonuses;passive_text:string;
 skill_id:string|null;upgradeable:boolean;upgrade_pc:number;max_rank:number;
 is_public:boolean;is_active:boolean;created_at:string;updated_at:string
}
export type AchievementDraft=Pick<AchievementDefinition,'name'|'description'|'category'|'rarity'|'bonuses'|'per_rank_bonuses'|'passive_text'|'skill_id'|'upgradeable'|'upgrade_pc'|'max_rank'|'is_public'|'is_active'>
export interface CharacterAchievement {character_id:string;achievement_id:string;rank:number;active_title:boolean;obtained_at:string;updated_at:string}
export interface MissionAchievementReward {mission_id:string;character_id:string;achievement_id:string}


// Conocimientos personales v1.1. No alteran ninguna estadística del personaje.
export type KnowledgeCategory = 'mundo'|'enemigos'|'personajes'|'historia'|'criaturas'|'lugares'|'magia'|'otros'
export type KnowledgeStatus = 'pendiente'|'aprobado'|'rechazado'
export interface KnowledgeEntry {
  id:string; character_id:string; title:string; description:string
  category:KnowledgeCategory; status:KnowledgeStatus; points:number
  dm_note:string; created_at:string; reviewed_at:string|null; updated_at:string
}
