import React from 'react';
import type { PlayerSlot, Team, SlotType } from '../types/game';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlayerSlotCardProps {
  slot: PlayerSlot;
  onChange: (updated: PlayerSlot) => void;
}

const TEAM_LABELS: Record<Team, string> = {
  NativePeoples: 'Povos Nativos',
  Colonizers: 'Colonizadores',
};

export function PlayerSlotCard({ slot, onChange }: PlayerSlotCardProps) {
  const isNative = slot.team === 'NativePeoples';

  return (
    <div
      className={`
        rounded-sm border-2 p-3 transition-all duration-200
        ${isNative
          ? 'border-native-green bg-native-green/10'
          : 'border-colonizer-red bg-colonizer-red/10'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-cinzel text-xs font-semibold text-sepia uppercase tracking-wider">
          Jogador {slot.id}
        </span>
        <div className="flex items-center gap-2">
          <Label htmlFor={`bot-${slot.id}`} className="text-xs font-fell text-sepia/80">
            {slot.type === 'Bot' ? '🤖 Bot' : '👤 Jogador'}
          </Label>
          <Switch
            id={`bot-${slot.id}`}
            checked={slot.type === 'Bot'}
            onCheckedChange={(checked) =>
              onChange({ ...slot, type: checked ? 'Bot' : 'Player' })
            }
            className="scale-75"
          />
        </div>
      </div>

      <Input
        value={slot.name}
        onChange={(e) => onChange({ ...slot, name: e.target.value })}
        placeholder={slot.type === 'Bot' ? `Bot ${slot.id}` : `Nome do Jogador ${slot.id}`}
        className="mb-2 h-7 text-xs font-fell bg-parchment/60 border-sepia/30 text-sepia placeholder:text-sepia/40"
        maxLength={20}
      />

      <Select
        value={slot.team}
        onValueChange={(val) => onChange({ ...slot, team: val as Team })}
      >
        <SelectTrigger className="h-7 text-xs font-fell bg-parchment/60 border-sepia/30 text-sepia">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-parchment border-sepia/40">
          <SelectItem value="NativePeoples" className="text-xs font-fell text-native-green">
            🌿 Povos Nativos
          </SelectItem>
          <SelectItem value="Colonizers" className="text-xs font-fell text-colonizer-red">
            ⚔️ Colonizadores
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
