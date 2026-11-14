import { WireSetModule } from './wireSet.js';
import { KeypadModule } from './keypad.js';
import { SafeModule } from './safe.js';
import { SecretPanelModule } from './secretPanel.js';
import { ClueModule } from './clue.js';
import { PlaceholderModule } from './placeholder.js';

const MODULE_TYPES = {
  wireSet: WireSetModule,
  keypad: KeypadModule,
  safe: SafeModule,
  secretPanel: SecretPanelModule,
  clue: ClueModule,
};

export function createModule(dto, face, kit) {
  const ModuleType = MODULE_TYPES[dto.type] ?? PlaceholderModule;
  return new ModuleType(dto, face, kit);
}
