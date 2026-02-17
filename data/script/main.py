#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HeySure AI 主脚本
自动生成 - 请勿手动修改此文件
所有自定义函数导入将自动添加到这里
"""

import sys
import json
from typing import Any, Dict, List, Optional

# 模式脚本存储
_mode_scripts: Dict[str, Any] = {}


def register_mode_script(script_id: str, module: Any) -> None:
    """注册模式脚本模块"""
    _mode_scripts[script_id] = module


def get_mode_script(script_id: str) -> Optional[Any]:
    """获取模式脚本模块"""
    return _mode_scripts.get(script_id)


def execute_mode_function(script_id: str, func_name: str, **kwargs: Any) -> Any:
    """
    执行模式脚本中的函数

    Args:
        script_id: 脚本ID
        func_name: 函数名
        **kwargs: 函数参数

    Returns:
        函数执行结果
    """
    module = get_mode_script(script_id)
    if module is None:
        raise ValueError(f"未找到脚本: {script_id}")

    func = getattr(module, func_name, None)
    if func is None:
        raise ValueError(f"未在脚本 {script_id} 中找到函数: {func_name}")

    return func(**kwargs)


def list_registered_scripts() -> List[str]:
    """列出所有已注册的脚本ID"""
    return list(_mode_scripts.keys())


def execute_from_command(script_id: str, func_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    从命令行执行模式函数

    Args:
        script_id: 脚本ID
        func_name: 函数名
        args: 参数字典

    Returns:
        包含结果和状态的字典
    """
    try:
        result = execute_mode_function(script_id, func_name, **args)
        return {
            "success": True,
            "result": result,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "result": None,
            "error": str(e)
        }


# ========== 自定义函数导入区域 ==========
# 此区域的内容由系统自动管理
from mode.BoxDisplay import show_box as BoxDisplay_show_box

# 此区域的内容由系统自动管理
# 此区域的内容由系统自动管理
# 请勿在此处添加自定义代码
# 如需添加自定义函数，请在对应的mode文件中编写

