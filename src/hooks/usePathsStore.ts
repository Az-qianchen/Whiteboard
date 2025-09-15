import { usePaths } from './usePaths';

/**
 * 路径相关状态的独立 store。
 * 当前只是对现有 usePaths 的包装，方便后续迁移到更专业的状态管理方案。
 */
export const usePathsStore = () => usePaths();
