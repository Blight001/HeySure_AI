/**
 * HeySure AI - Python 执行 IPC 处理器
 * 处理 Python 脚本的动态执行：
 * - python:execute: 执行指定的 Python 函数
 *   - 接受文件路径、函数名、输入参数
 *   - 使用子进程执行 Python 代码
 *   - 支持超时设置
 *   - 通过 stdin/stdout 与 Python 进程通信
 *   - 返回执行结果或错误信息
 */
import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';

export function pythonIPC() {
  ipcMain.handle('python:execute', async (_, request: {
    filePath: string;
    functionName: string;
    inputs: Record<string, any>;
    config?: any;
  }) => {
    return new Promise((resolve, reject) => {
      const { filePath, functionName, inputs } = request;
      
      console.log('[PythonIPC] Executing:', { filePath, functionName, inputs });

      // Normalize path to use forward slashes to avoid backslash escaping issues in Python/JSON
      // Windows Python handles forward slashes correctly and this avoids 'D:\1...' becoming 'D:\x01...'
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      
      const requestData = {
        ...request,
        filePath: normalizedFilePath
      };

      // Python runner script to be executed via -c
      const runnerScript = `
import sys
import json
import importlib.util
import os
import traceback

# Ensure output is UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

def run():
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        file_path = input_data.get('filePath')
        func_name = input_data.get('functionName')
        args = input_data.get('inputs', {})

        if not file_path or not os.path.exists(file_path):
            print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
            return

        # Add directory to sys.path to allow relative imports if needed
        file_dir = os.path.dirname(file_path)
        if file_dir not in sys.path:
            sys.path.insert(0, file_dir)

        # Load module
        spec = importlib.util.spec_from_file_location("user_module", file_path)
        if spec is None or spec.loader is None:
            print(json.dumps({"success": False, "error": f"Could not load module from {file_path}"}))
            return

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Get function
        func = getattr(module, func_name, None)
        if func is None:
            print(json.dumps({"success": False, "error": f"Function {func_name} not found"}))
            return

        # Execute function
        # Assuming args is a dictionary and function accepts kwargs
        # If the function does not accept kwargs, this might fail.
        # But for this system, we assume a convention of kwargs or we try.
        try:
            result = func(**args)
        except TypeError as e:
             # Fallback: try passing as single dict if it fails (optional, but sticking to kwargs for now)
             raise e

        print(json.dumps({"success": True, "output": result}))

    except Exception as e:
        print(json.dumps({
            "success": False, 
            "error": str(e),
            "traceback": traceback.format_exc()
        }))

if __name__ == "__main__":
    run()
`;

      const pythonProcess = spawn('python', ['-c', runnerScript]);
      
      let isTimedOut = false;

      // Set timeout if configured
      if (request.config?.timeout) {
        setTimeout(() => {
          if (!pythonProcess.killed) {
            isTimedOut = true;
            pythonProcess.kill();
            console.error('[PythonIPC] Execution timed out');
          }
        }, request.config.timeout * 1000);
      }

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('[PythonIPC] stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (isTimedOut) {
           resolve({ 
            success: false, 
            error: `Execution timed out after ${request.config.timeout}s`
          });
          return;
        }

        if (code !== 0) {
          console.error('[PythonIPC] Process exited with code:', code);
          resolve({ 
            success: false, 
            error: `Process exited with code ${code}`,
            details: errorData 
          });
          return;
        }

        try {
          // Find the last JSON object in the output
          // (In case user script prints other things)
          const lines = outputData.trim().split('\n');
          let result = null;
          
          // Try to parse from the end
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const parsed = JSON.parse(lines[i]);
              if (parsed && (parsed.success !== undefined)) {
                result = parsed;
                break;
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }

          if (result) {
            // Attach full output as logs (excluding the result line if desired, but here we keep it all for debug)
            result.logs = outputData;
            resolve(result);
          } else {
             resolve({ 
              success: false, 
              error: 'Invalid output format from Python script',
              rawOutput: outputData
            });
          }
        } catch (e) {
          resolve({ 
            success: false, 
            error: 'Failed to parse output',
            rawOutput: outputData
          });
        }
      });

      // Send data to stdin
      pythonProcess.stdin.write(JSON.stringify(requestData));
      pythonProcess.stdin.end();
    });
  });
}
