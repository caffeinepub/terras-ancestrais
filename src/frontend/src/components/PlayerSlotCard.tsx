import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import React from "react";
import type { ClassType, PlayerSlot, Team } from "../types/game";

interface PlayerSlotCardProps {
  slot: PlayerSlot;
  onChange: (updated: PlayerSlot) => void;
  slotIndex: number;
}

const NATIVE_CLASSES: { value: ClassType; label: string; emblem: string }[] = [
  {
    value: "ForestWarrior",
    label: "Guerreiro da Floresta",
    emblem: "/assets/generated/emblem-forest-warrior.dim_128x128.png",
  },
  {
    value: "SpiritHunter",
    label: "Caçador Espiritual",
    emblem: "/assets/generated/emblem-spirit-hunter.dim_128x128.png",
  },
  {
    value: "Shaman",
    label: "Xamã",
    emblem: "/assets/generated/emblem-shaman.dim_128x128.png",
  },
  {
    value: "Sentinel",
    label: "Sentinela",
    emblem: "/assets/generated/emblem-sentinel.dim_128x128.png",
  },
];

const COLONIZER_CLASSES: { value: ClassType; label: string; emblem: string }[] =
  [
    {
      value: "MusketSoldier",
      label: "Soldado de Mosquete",
      emblem: "/assets/generated/emblem-musket-soldier.dim_128x128.png",
    },
    {
      value: "Captain",
      label: "Capitão",
      emblem: "/assets/generated/emblem-captain.dim_128x128.png",
    },
    {
      value: "Engineer",
      label: "Engenheiro",
      emblem: "/assets/generated/emblem-engineer.dim_128x128.png",
    },
    {
      value: "Missionary",
      label: "Missionário",
      emblem: "/assets/generated/emblem-missionary.dim_128x128.png",
    },
  ];

function getClassesForTeam(team: Team) {
  return team === "NativePeoples" ? NATIVE_CLASSES : COLONIZER_CLASSES;
}

function getDefaultClassForTeam(team: Team): ClassType {
  return team === "NativePeoples" ? "ForestWarrior" : "MusketSoldier";
}

function getEmblemForClass(classType: ClassType): string {
  const all = [...NATIVE_CLASSES, ...COLONIZER_CLASSES];
  return all.find((c) => c.value === classType)?.emblem || "";
}

export function PlayerSlotCard({
  slot,
  onChange,
  slotIndex,
}: PlayerSlotCardProps) {
  const isNative = slot.team === "NativePeoples";
  const classes = getClassesForTeam(slot.team);
  const _selectedClass =
    classes.find((c) => c.value === slot.class) || classes[0];

  const handleTeamChange = (team: Team) => {
    const defaultClass = getDefaultClassForTeam(team);
    onChange({ ...slot, team, class: defaultClass });
  };

  const handleClassChange = (classType: ClassType) => {
    onChange({ ...slot, class: classType });
  };

  return (
    <div
      className={`rounded-lg border-2 p-3 transition-all ${
        isNative
          ? "border-native-green/40 bg-native-green/5"
          : "border-colonizer-red/40 bg-colonizer-red/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-cinzel text-xs font-bold text-parchment/70">
          Jogador {slotIndex + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor={`bot-${slot.id}`}
            className="text-xs text-parchment/60"
          >
            Bot
          </Label>
          <Switch
            id={`bot-${slot.id}`}
            checked={slot.isBot}
            onCheckedChange={(checked) => onChange({ ...slot, isBot: checked })}
            className="scale-75"
          />
        </div>
      </div>

      {/* Name */}
      {!slot.isBot && (
        <input
          type="text"
          value={slot.name}
          onChange={(e) => onChange({ ...slot, name: e.target.value })}
          placeholder="Nome do jogador"
          className="w-full bg-parchment/10 border border-parchment/20 rounded px-2 py-1 text-xs text-parchment placeholder-parchment/40 mb-2 focus:outline-none focus:border-ochre/60"
        />
      )}
      {slot.isBot && (
        <div className="text-xs text-parchment/50 italic mb-2 px-1">
          🤖 Controlado por IA
        </div>
      )}

      {/* Team Selector */}
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => handleTeamChange("NativePeoples")}
          className={`flex-1 text-xs py-1 px-2 rounded font-cinzel transition-all ${
            isNative
              ? "bg-native-green text-parchment font-bold"
              : "bg-parchment/10 text-parchment/50 hover:bg-native-green/20"
          }`}
        >
          🛖 Nativos
        </button>
        <button
          type="button"
          onClick={() => handleTeamChange("Colonizers")}
          className={`flex-1 text-xs py-1 px-2 rounded font-cinzel transition-all ${
            !isNative
              ? "bg-colonizer-red text-parchment font-bold"
              : "bg-parchment/10 text-parchment/50 hover:bg-colonizer-red/20"
          }`}
        >
          🏴‍☠️ Colonizadores
        </button>
      </div>

      {/* Class Selector */}
      <div className="space-y-1">
        <Label className="text-xs text-parchment/60 font-cinzel">Classe</Label>
        <Select
          value={slot.class}
          onValueChange={(v) => handleClassChange(v as ClassType)}
        >
          <SelectTrigger className="bg-parchment/10 border-parchment/20 text-parchment text-xs h-8">
            <div className="flex items-center gap-2">
              <img
                src={getEmblemForClass(slot.class)}
                alt={slot.class}
                className="w-5 h-5 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-sepia border-parchment/30">
            {classes.map((cls) => (
              <SelectItem
                key={cls.value}
                value={cls.value}
                className="text-parchment hover:bg-parchment/10"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={cls.emblem}
                    alt={cls.label}
                    className="w-6 h-6 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs">{cls.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class Description */}
      <div className="mt-2 text-xs text-parchment/50 italic">
        {getClassDescription(slot.class)}
      </div>
    </div>
  );
}

function getClassDescription(classType: ClassType): string {
  const descriptions: Record<ClassType, string> = {
    ForestWarrior: "Combate corpo a corpo, camuflagem na floresta",
    SpiritHunter: "Ataques à distância, marca inimigos",
    Shaman: "Cura aliados, enfraquece inimigos",
    Sentinel: "Defesa máxima, destrói construções",
    MusketSoldier: "Alto dano à distância, forte em campo aberto",
    Captain: "Buffs para aliados, formação defensiva",
    Engineer: "Constrói torres e fortalezas",
    Missionary: "Cura aliados, pacifica inimigos",
  };
  return descriptions[classType] || "";
}
