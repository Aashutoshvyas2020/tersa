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


def command_scenario(command: str, *, settle: float = 1.2) -> list[dict[str, object]]:
    return [
        {'wait_for': 'High'},
        {'send': f'/{command}'.encode() + ENTER, 'settle': settle, 'checkpoint': command},
    ]


CORE_SCENARIOS.update({
    'add-dir': command_scenario('add-dir'),
    'agents': command_scenario('agents', settle=1.8),
    'branch': command_scenario('branch'),
    'btw': command_scenario('btw'),
    'cache-probe': command_scenario('cache-probe', settle=2.5),
    'cache-stats': command_scenario('cache-stats'),
    'clear': command_scenario('clear'),
    'commit-message': command_scenario('commit-message'),
    'compact': command_scenario('compact', settle=2.5),
    'copy': command_scenario('copy'),
    'diff': command_scenario('diff', settle=1.8),
    'doctor': command_scenario('doctor', settle=2.5),
    'exit': command_scenario('exit'),
    'export': command_scenario('export'),
    'fast': command_scenario('fast'),
    'heapdump': command_scenario('heapdump', settle=2.5),
    'hooks': command_scenario('hooks', settle=1.8),
    'knowledge': command_scenario('knowledge', settle=1.8),
    'logo': command_scenario('logo'),
    'memory': command_scenario('memory', settle=1.8),
    'output-style': command_scenario('output-style'),
    'passes': command_scenario('passes'),
    'reload-plugins': command_scenario('reload-plugins', settle=1.8),
    'rename': command_scenario('rename'),
    'resume': command_scenario('resume', settle=1.8),
    'rewind': command_scenario('rewind', settle=1.8),
    'tasks': command_scenario('tasks', settle=1.8),
    'usage': command_scenario('usage', settle=2.5),
    'wiki': command_scenario('wiki', settle=1.8),
})
