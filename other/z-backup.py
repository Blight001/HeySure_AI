# -*- coding: utf-8 -*-
"""
HeySure AI 一键备份脚本

功能：
- 一键备份重要文件到 backup 文件夹
- 自动创建带时间戳的压缩备份包
- 支持全量备份和增量备份
- 显示详细的备份进度和统计信息
- 默认使用 ZIP 压缩备份

备份内容：
- data/      - 用户数据（对话、流程、思维导图、配置等）
- resources/ - 资源文件（Python 脚本等）
- src/       - 前端源代码（React）
- electron/  - Electron 主进程代码
- public/    - 静态资源
- scripts/   - 维护脚本
"""

import os
import sys
import json
import shutil
import zipfile
import hashlib
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Set, Optional
from enum import Enum
 

class BackupMode(Enum):
    """备份模式"""
    FULL = "full"      # 全量备份
    INCREMENTAL = "incremental"  # 增量备份


class BackupScript:
    """HeySure AI 备份脚本"""

    def __init__(self):
        # 项目根目录 (脚本在 scripts/ 目录下，所以是上上级目录)
        self.project_root = Path(__file__).parent.parent.resolve()

        # backup 文件夹路径
        self.backup_dir = Path(__file__).parent.resolve() / "backup"

        # 备份清单文件路径
        self.manifest_file = self.backup_dir / "manifest.json"

        # 需要备份的目录（相对路径）
        self.backup_dirs: List[Path] = [
            Path("data"),            # 用户数据
            Path("resources"),       # 资源文件（含 Python 脚本）
            Path("src"),             # 前端源代码
            Path("electron"),        # Electron 主进程代码
            Path("public"),          # 静态资源
            Path("scripts"),         # 脚本文件
        ]

        # 需要备份的配置文件（相对路径）
        self.backup_files: List[Path] = [
            Path("package.json"),
            Path("tsconfig.json"),
            Path("tsconfig.node.json"),
            Path("tailwind.config.js"),
            Path("postcss.config.js"),
            Path("vite.config.ts"),
            Path(".editorconfig"),
            Path(".eslintrc.json"),
            Path(".prettierrc"),
            Path(".gitignore"),
            Path("electron.vite.config.ts"),
            Path("README.md"),
        ]

        # 要排除的文件/文件夹模式
        self.exclude_patterns: List[str] = [
            "__pycache__",
            "*.pyc",
            "*.pyo",
            ".git",
            "node_modules",
            "dist-electron",
            "release",
            "*.log",
            ".env",
            ".env.local",
        ]

        # 颜色输出
        self.colors = {
            "GREEN": "\033[92m",
            "YELLOW": "\033[93m",
            "RED": "\033[91m",
            "BLUE": "\033[94m",
            "CYAN": "\033[96m",
            "RESET": "\033[0m",
            "BOLD": "\033[1m",
        }

        # 备份清单
        self.manifest: Dict = {
            "last_backup_time": None,
            "last_backup_hash": None,
            "backups": []
        }

        # 统计信息
        self.stats = {
            "total_files": 0,
            "copied_files": 0,
            "skipped_files": 0,
            "total_size": 0,
            "copied_size": 0,
            "errors": []
        }

    def color_print(self, text: str, color: str = "GREEN"):
        """彩色打印"""
        print(f"{self.colors.get(color, self.colors['GREEN'])}{text}{self.colors['RESET']}")

    def print_banner(self):
        """打印横幅"""
        banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🚀 HeySure AI 一键备份工具 v1.0                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"""
        self.color_print(banner, "CYAN")

    def load_manifest(self):
        """加载备份清单"""
        if self.manifest_file.exists():
            try:
                with open(self.manifest_file, 'r', encoding='utf-8') as f:
                    self.manifest = json.load(f)
            except Exception as e:
                self.color_print(f"⚠️  加载清单文件失败: {e}", "YELLOW")
                self.manifest = {"last_backup_time": None, "last_backup_hash": None, "backups": []}

    def save_manifest(self):
        """保存备份清单"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_file, 'w', encoding='utf-8') as f:
            json.dump(self.manifest, f, ensure_ascii=False, indent=2)

    def calculate_file_hash(self, file_path: Path) -> str:
        """计算文件哈希值"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception:
            return ""

    def get_file_info(self, file_path: Path) -> Dict:
        """获取文件信息"""
        stat = file_path.stat()
        return {
            "path": str(file_path),
            "hash": self.calculate_file_hash(file_path),
            "size": stat.st_size,
            "mtime": stat.st_mtime,
            "ctime": stat.st_ctime
        }

    def should_exclude(self, path: Path) -> bool:
        """检查是否应该排除"""
        path_str = str(path)
        for pattern in self.exclude_patterns:
            if pattern.startswith("*"):
                # 通配符匹配
                if path_str.endswith(pattern[1:]) or path.name.endswith(pattern[1:]):
                    return True
            elif pattern in path_str:
                return True
        return False

    def scan_directory(self, dir_path: Path) -> Dict[str, Dict]:
        """扫描目录，返回所有文件信息"""
        files_info = {}

        if not dir_path.exists():
            return files_info

        for root, dirs, files in os.walk(dir_path):
            current_path = Path(root)

            # 排除指定目录
            dirs[:] = [d for d in dirs if not self.should_exclude(current_path / d)]

            for file in files:
                file_path = current_path / file

                if not self.should_exclude(file_path):
                    rel_path = file_path.relative_to(self.project_root)
                    files_info[str(rel_path)] = self.get_file_info(file_path)

        return files_info

    def compare_with_last_backup(self, current_files: Dict[str, Dict]) -> Set[str]:
        """与上次备份比较，返回需要更新的文件"""
        changed_files = set()

        if self.manifest.get("last_backup_hash") is None:
            # 没有上次备份，所有文件都需要备份
            return set(current_files.keys())

        # 比较文件哈希
        last_backup_hash = self.manifest.get("last_backup_hash", {})

        for file_path, info in current_files.items():
            if file_path not in last_backup_hash:
                # 新文件
                changed_files.add(file_path)
            elif last_backup_hash[file_path].get("hash") != info.get("hash"):
                # 文件已修改
                changed_files.add(file_path)

        return changed_files

    def format_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.2f} TB"

    def create_backup(self, mode: BackupMode = BackupMode.FULL):
        """执行备份（默认使用压缩包形式）"""
        self.print_banner()
        self.color_print(f"📁 项目根目录: {self.project_root}\n")

        # 确保 backup 目录存在
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # 加载清单
        self.load_manifest()

        # 创建带时间戳的压缩备份文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"backup_{timestamp}.zip"

        self.color_print(f"📂 备份文件: {backup_file}\n")
        self.color_print("🔍 正在扫描文件...")

        # 扫描需要备份的目录和文件
        files_to_backup = {}

        for dir_path in self.backup_dirs:
            abs_path = self.project_root / dir_path
            files = self.scan_directory(abs_path)
            files_to_backup.update(files)
            print(f"   扫描 {dir_path}: {len(files)} 个文件")

        # 扫描需要备份的配置文件
        for file_path in self.backup_files:
            abs_path = self.project_root / file_path
            if abs_path.exists() and not self.should_exclude(abs_path):
                files_to_backup[str(file_path)] = self.get_file_info(abs_path)

        self.stats["total_files"] = len(files_to_backup)

        # 根据备份模式确定需要备份的文件
        if mode == BackupMode.INCREMENTAL:
            self.color_print("\n🔄 增量备份模式...")
            files_list = list(self.compare_with_last_backup(files_to_backup))
        else:
            self.color_print("\n🔄 全量备份模式...")
            files_list = list(files_to_backup.keys())

        self.color_print(f"   需要备份的文件数: {len(files_list)}\n")

        # 创建压缩文件
        self.color_print("📦 正在压缩文件...")
        start_time = time.time()

        total_size = 0
        compressed_size = 0
        copied_count = 0

        with zipfile.ZipFile(backup_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, file_path in enumerate(sorted(files_list)):
                src = self.project_root / file_path
                arcname = file_path  # 在 zip 中的路径

                try:
                    if src.exists():
                        zipf.write(src, arcname)
                        total_size += files_to_backup[file_path]["size"]
                        copied_count += 1

                        # 进度显示
                        if (i + 1) % 100 == 0 or (i + 1) == len(files_list):
                            progress = (i + 1) / len(files_list) * 100
                            print(f"   进度: {progress:.1f}% ({i + 1}/{len(files_list)})")

                except Exception as e:
                    self.stats["errors"].append(f"压缩 {file_path} 失败: {e}")
                    self.color_print(f"   ❌ 错误: {file_path} - {e}", "RED")

        compressed_size = backup_file.stat().st_size
        elapsed_time = time.time() - start_time

        # 保存备份信息
        backup_info = {
            "timestamp": timestamp,
            "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mode": mode.value,
            "total_files": copied_count,
            "total_size": total_size,
            "compressed_size": compressed_size,
            "files_hash": {k: v for k, v in files_to_backup.items() if k in files_list}
        }

        self.manifest["last_backup_time"] = timestamp
        self.manifest["last_backup_hash"] = files_to_backup
        self.manifest["backups"].append(backup_info)

        # 只保留最近 10 次备份记录
        if len(self.manifest["backups"]) > 10:
            old_backup = self.manifest["backups"].pop(0)
            old_backup_file = self.backup_dir / f"backup_{old_backup['timestamp']}.zip"
            if old_backup_file.exists():
                old_backup_file.unlink()

        self.save_manifest()

        # 打印备份结果
        self.print_backup_summary(backup_file, copied_count, total_size, compressed_size, elapsed_time)

        return backup_file

    def print_backup_summary(self, backup_file: Path, copied: int, total: int, compressed: float, elapsed: float):
        """打印备份摘要"""
        self.color_print("\n" + "=" * 60, "CYAN")
        self.color_print("✅ 备份完成！", "GREEN")
        self.color_print("=" * 60, "CYAN")

        self.color_print(f"\n📂 备份文件: {backup_file}")
        self.color_print(f"📄 备份文件数: {copied}")
        self.color_print(f"💾 原始大小: {self.format_size(total)}")
        self.color_print(f"📦 压缩后大小: {self.format_size(compressed)}")
        self.color_print(f"📊 压缩率: {total / compressed if compressed > 0 else 1:.2f}x")
        self.color_print(f"⏱️  耗时: {elapsed:.2f} 秒")

        if self.stats["errors"]:
            self.color_print(f"\n⚠️  错误数: {len(self.stats['errors'])}", "YELLOW")
            for error in self.stats["errors"][:5]:  # 只显示前 5 个错误
                self.color_print(f"   - {error}", "YELLOW")

        self.color_print("\n" + "=" * 60)

    def list_backups(self):
        """列出所有备份"""
        self.print_banner()
        self.color_print("📋 备份列表\n")

        if not self.backup_dir.exists():
            self.color_print("暂无备份", "YELLOW")
            return

        backups = sorted(self.backup_dir.glob("backup_*.zip"), key=lambda x: x.stat().st_mtime, reverse=True)

        if not backups:
            self.color_print("暂无备份", "YELLOW")
            return

        self.color_print(f"{'序号':<6}{'备份时间':<20}{'类型':<12}{'大小':<15}", "BOLD")
        self.color_print("-" * 55, "CYAN")

        for i, backup in enumerate(backups, 1):
            if backup.suffix == ".zip":
                # 压缩备份
                size = backup.stat().st_size
                file_count = "ZIP"
                backup_type = "ZIP压缩"
            else:
                continue

            timestamp = backup.name.replace("backup_", "").replace(".zip", "")
            try:
                dt = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")
                time_str = dt.strftime("%Y-%m-%d %H:%M")
            except:
                time_str = timestamp[:14]

            self.color_print(f"{i:<6}{time_str:<20}{backup_type:<12}{self.format_size(size):<15}")

        self.color_print("-" * 55)

    def restore_backup(self, backup_index: int = 1):
        """恢复备份"""
        self.print_banner()
        self.color_print("🔄 恢复备份\n")

        backups = sorted(self.backup_dir.glob("backup_*.zip"), key=lambda x: x.stat().st_mtime, reverse=True)

        if not backups or len(backups) < backup_index:
            self.color_print("❌ 未找到备份", "RED")
            return

        backup = backups[backup_index - 1]

        self.color_print(f"📦 从压缩包恢复: {backup}")

        self.color_print("\n⚠️  即将恢复以下文件:", "YELLOW")
        try:
            with zipfile.ZipFile(backup, 'r') as zipf:
                preview_items = zipf.namelist()[:20]
                for item in preview_items:
                    self.color_print(f"   {item}")
        except Exception as e:
            self.color_print(f"   无法读取压缩包内容: {e}", "RED")

        confirm = input("\n确认恢复? (y/n): ").strip().lower()
        if confirm != 'y':
            self.color_print("已取消", "YELLOW")
            return

        # 恢复文件
        try:
            with zipfile.ZipFile(backup, 'r') as zipf:
                zipf.extractall(self.project_root)
            self.color_print("\n✅ 恢复完成!", "GREEN")
        except Exception as e:
            self.color_print(f"\n❌ 恢复失败: {e}", "RED")


def main():
    """主函数"""
    script = BackupScript()

    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command in ['-h', '--help', 'help']:
            print("""
HeySure AI 备份脚本使用指南

用法:
    python backup.py [命令] [选项]

命令:
    backup         执行备份（默认压缩为 ZIP 文件）
    zip            执行压缩备份（备份为 ZIP 文件）
    list           列出所有备份
    restore        恢复最近的备份
    restore N      恢复第 N 个备份（按时间倒序）
    help           显示此帮助信息

选项:
    -h, --help     显示帮助信息
    --full         全量备份（默认）
    --inc, --incremental  增量备份

示例:
    python backup.py                    # 默认压缩备份
    python backup.py backup             # 执行备份（压缩为 ZIP）
    python backup.py backup --inc       # 增量压缩备份
    python backup.py zip                # 压缩备份（同 backup）
    python backup.py list               # 列出所有备份
    python backup.py restore 1          # 恢复最新的备份
            """)
            return

        if command == 'list':
            script.list_backups()
            return

        if command == 'restore':
            backup_index = int(sys.argv[2]) if len(sys.argv) > 2 else 1
            script.restore_backup(backup_index)
            return

        if command == 'zip':
            # zip 命令等同于 backup 命令
            mode = BackupMode.FULL
            if len(sys.argv) > 2 and sys.argv[2] in ['--inc', '--incremental']:
                mode = BackupMode.INCREMENTAL
            script.create_backup(mode)
            return

        if command == 'backup':
            mode = BackupMode.FULL
            if len(sys.argv) > 2 and sys.argv[2] in ['--inc', '--incremental']:
                mode = BackupMode.INCREMENTAL
            script.create_backup(mode)
            return

    # 默认执行压缩备份
    script.create_backup(BackupMode.FULL)


if __name__ == "__main__":
    main()

