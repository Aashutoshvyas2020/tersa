from __future__ import annotations

ESC = b'\x1b'
ENTER = b'\r'
CTRL_C = b'\x03'
TAB = b'\t'
UP = b'\x1b[A'
DOWN = b'\x1b[B'
LEFT = b'\x1b[D'
RIGHT = b'\x1b[C'

CORE_SCENARIOS = {
    'startup': [
        {'wait_for': 'High', 'checkpoint': 'startup'},
    ],
    'typed-prompt': [
        {'wait_for': 'High'},
        {'send': b'visual audit keyboard input', 'settle': 0.5, 'checkpoint': 'typed-prompt'},
    ],
    'autocomplete': [
        {'wait_for': 'High'},
        {'send': b'/sta', 'settle': 1.0, 'checkpoint': 'autocomplete'},
        {'send': DOWN, 'settle': 0.3, 'checkpoint': 'autocomplete-down'},
        {'send': ESC, 'settle': 0.3, 'checkpoint': 'autocomplete-dismissed'},
    ],
    'model': [
        {'wait_for': 'High'},
        {'send': b'/model' + ENTER, 'wait_for': 'Select', 'checkpoint': 'model'},
        {'send': RIGHT, 'settle': 0.3, 'checkpoint': 'model-effort-right'},
    ],
    'help': [
        {'wait_for': 'High'},
        {'send': b'/help' + ENTER, 'wait_for': 'Start here', 'checkpoint': 'help'},
    ],
    'modes': [
        {'wait_for': 'High'},
        {'send': b'/modes' + ENTER, 'wait_for': 'Modes', 'checkpoint': 'modes'},
    ],
    'statusline': [
        {'wait_for': 'High'},
        {'send': b'/statusline' + ENTER, 'wait_for': 'Status', 'checkpoint': 'statusline'},
    ],
    'permissions': [
        {'wait_for': 'High'},
        {'send': b'/permissions' + ENTER, 'wait_for': 'Permissions', 'checkpoint': 'permissions'},
    ],
    'status': [
        {'wait_for': 'High'},
        {'send': b'/status' + ENTER, 'wait_for': 'Session', 'checkpoint': 'status'},
    ],
    'provider': [
        {'wait_for': 'High'},
        {'send': b'/provider' + ENTER, 'wait_for': 'Provider manager', 'checkpoint': 'provider'},
    ],
    'context': [
        {'wait_for': 'High'},
        {'send': b'/context' + ENTER, 'wait_for': 'Context', 'checkpoint': 'context'},
    ],
    'request-size': [
        {'wait_for': 'High'},
        {'send': b'/request-size' + ENTER, 'wait_for': 'Request context size', 'checkpoint': 'request-size'},
    ],
    'skills': [
        {'wait_for': 'High'},
        {'send': b'/skills' + ENTER, 'wait_for': 'Skills', 'checkpoint': 'skills'},
    ],
    'terminal-setup': [
        {'wait_for': 'High'},
        {'send': b'/terminal-setup' + ENTER, 'wait_for': 'Terminal setup', 'checkpoint': 'terminal-setup'},
    ],
    'config': [
        {'wait_for': 'High'},
        {'send': b'/config' + ENTER, 'settle': 1.5, 'checkpoint': 'config'},
        {'send': DOWN, 'settle': 0.3, 'checkpoint': 'config-down'},
        {'send': b' ', 'settle': 0.3, 'checkpoint': 'config-toggle'},
    ],
    'theme': [
        {'wait_for': 'High'},
        {'send': b'/theme' + ENTER, 'settle': 1.2, 'checkpoint': 'theme'},
        {'send': DOWN, 'settle': 0.3, 'checkpoint': 'theme-down'},
    ],
    'effort': [
        {'wait_for': 'High'},
        {'send': b'/effort' + ENTER, 'settle': 1.0, 'checkpoint': 'effort'},
    ],
    'plan': [
        {'wait_for': 'High'},
        {'send': b'/plan' + ENTER, 'settle': 1.0, 'checkpoint': 'plan'},
    ],
    'mcp': [
        {'wait_for': 'High'},
        {'send': b'/mcp' + ENTER, 'settle': 1.5, 'checkpoint': 'mcp'},
    ],
    'plugin': [
        {'wait_for': 'High'},
        {'send': b'/plugin' + ENTER, 'settle': 1.5, 'checkpoint': 'plugin'},
    ],
    'vim': [
        {'wait_for': 'High'},
        {'send': b'/vim' + ENTER, 'settle': 1.0, 'checkpoint': 'vim-enabled'},
        {'send': b'vim audit text', 'settle': 0.4, 'checkpoint': 'vim-insert'},
        {'send': ESC, 'settle': 0.4, 'checkpoint': 'vim-normal'},
        {'send': b'0x', 'settle': 0.4, 'checkpoint': 'vim-delete'},
    ],
}
