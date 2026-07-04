from __future__ import annotations

ESC = b'\x1b'
ENTER = b'\r'
CTRL_C = b'\x03'
TAB = b'\t'
UP = b'\x1b[A'
DOWN = b'\x1b[B'
LEFT = b'\x1b[D'
RIGHT = b'\x1b[C'
HOME = b'\x1b[H'
END = b'\x1b[F'
DELETE = b'\x1b[3~'
BACKSPACE = b'\x7f'
PAGE_UP = b'\x1b[5~'
PAGE_DOWN = b'\x1b[6~'
CTRL_HOME = b'\x1b[1;5H'
CTRL_END = b'\x1b[1;5F'
SHIFT_TAB = b'\x1b[Z'
CTRL_A = b'\x01'
CTRL_B = b'\x02'
CTRL_D = b'\x04'
CTRL_E = b'\x05'
CTRL_G = b'\x07'
CTRL_K = b'\x0b'
CTRL_L = b'\x0c'
CTRL_N = b'\x0e'
CTRL_O = b'\x0f'
CTRL_P = b'\x10'
CTRL_R = b'\x12'
CTRL_S = b'\x13'
CTRL_T = b'\x14'
CTRL_U = b'\x15'
CTRL_V = b'\x16'
CTRL_W = b'\x17'
CTRL_X = b'\x18'
CTRL_Y = b'\x19'
CTRL_UNDERSCORE = b'\x1f'
META_O = b'\x1bo'
META_P = b'\x1bp'
META_T = b'\x1bt'
SHIFT_ENTER = b'\x1b[13;2u'
MOUSE_WHEEL_UP = b'\x1b[<64;1;1M'
MOUSE_WHEEL_DOWN = b'\x1b[<65;1;1M'

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
    'keyboard-modes-escape-scrollback': [
        {'wait_for': 'High', 'checkpoint': 'startup'},
        {'send': b'/modes' + ENTER, 'wait_for': 'Modes', 'checkpoint': 'modes-open'},
        {'send': ESC, 'settle': 0.6, 'assert_not_contains': 'Modes updated', 'checkpoint': 'modes-closed'},
        {'send': PAGE_UP + CTRL_HOME, 'settle': 0.6, 'checkpoint': 'scrolled-top'},
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
        {'send': b'/context' + ENTER, 'wait_for': 'Largest contributors', 'timeout': 20.0, 'checkpoint': 'context'},
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
    'exit': [
        {'wait_for': 'High'},
        {
            'send': b'/exit' + ENTER,
            'wait_for_exit': True,
            'timeout': 15.0,
            'checkpoint': 'exit',
        },
    ],
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

CORE_SCENARIOS.update({
    'keyboard-coalesced-control': [
        {'wait_for': 'High'},
        {'send': b'ac', 'settle': 0.2},
        {'send': LEFT + b'b', 'settle': 0.2, 'assert_prompt_contains': 'abc'},
        {'send': CTRL_A + b'start ', 'settle': 0.3, 'assert_prompt_contains': 'start abc', 'checkpoint': 'coalesced-ctrl-a'},
        {'send': CTRL_E + b' end', 'settle': 0.3, 'assert_prompt_contains': 'start abc end', 'checkpoint': 'coalesced-ctrl-e'},
    ],
    'keyboard-prompt-editing': [
        {'wait_for': 'High'},
        {'send': b'ac', 'settle': 0.2, 'assert_contains': 'ac', 'checkpoint': 'typed-ac'},
        {'send': LEFT + b'b', 'settle': 0.2, 'assert_contains': 'abc', 'checkpoint': 'insert-middle'},
        {'send': CTRL_A, 'settle': 0.2, 'checkpoint': 'ctrl-a'},
        {'send': b'start ', 'settle': 0.2, 'assert_contains': 'start abc', 'checkpoint': 'ctrl-a-prefix'},
        {'send': CTRL_E, 'settle': 0.2, 'checkpoint': 'ctrl-e'},
        {'send': b' end', 'settle': 0.2, 'assert_contains': 'start abc end', 'checkpoint': 'ctrl-e-suffix'},
        {'send': CTRL_W, 'settle': 0.2, 'assert_contains': 'start abc', 'assert_not_contains': ' end', 'checkpoint': 'ctrl-w'},
        {'send': HOME + DELETE, 'settle': 0.2, 'assert_contains': 'tart abc', 'checkpoint': 'home-delete'},
        {'send': END + BACKSPACE, 'settle': 0.2, 'assert_contains': 'tart ab', 'checkpoint': 'end-backspace'},
        {'send': CTRL_U, 'settle': 0.2, 'assert_not_contains': 'tart ab', 'checkpoint': 'ctrl-u-clear'},
    ],
    'keyboard-unicode-fragmented': [
        {'wait_for': 'High'},
        {
            'send_chunks': [bytes([byte]) for byte in 'Café 漢字 👋🏽'.encode('utf-8')],
            'chunk_delay': 0.01,
            'settle': 0.4,
            'assert_contains': 'Café 漢字 👋🏽',
            'assert_not_contains': '�',
            'checkpoint': 'unicode-fragmented',
        },
    ],
    'keyboard-bracketed-paste': [
        {'wait_for': 'High'},
        {
            'send': b'\x1b[200~pasted line one\npasted line two\x1b[201~',
            'settle': 0.5,
            'assert_contains': 'pasted line one',
        },
        {'assert_contains': 'pasted line two', 'checkpoint': 'bracketed-paste'},
    ],
    'keyboard-autocomplete-navigation': [
        {'wait_for': 'High'},
        {'send': b'/sta', 'settle': 0.8, 'checkpoint': 'autocomplete-open'},
        {'send': DOWN + UP, 'settle': 0.3, 'checkpoint': 'autocomplete-cycle'},
        {'send': TAB, 'settle': 0.3, 'assert_contains': '/status', 'checkpoint': 'autocomplete-accepted'},
        {'send': ESC, 'settle': 0.2, 'checkpoint': 'autocomplete-escape'},
    ],
    'keyboard-select-navigation': [
        {'wait_for': 'High'},
        {'send': b'/effort' + ENTER, 'wait_for': 'Set effort level', 'checkpoint': 'select-open'},
        {'send': DOWN + b'j' + CTRL_N, 'settle': 0.3, 'checkpoint': 'select-down-keys'},
        {'send': UP + b'k' + CTRL_P, 'settle': 0.3, 'checkpoint': 'select-up-keys'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'high', 'checkpoint': 'select-cancel'},
    ],
    'keyboard-model-picker': [
        {'wait_for': 'High'},
        {'send': b'/model' + ENTER, 'wait_for': 'Select', 'checkpoint': 'model-open'},
        {'send': RIGHT + LEFT, 'settle': 0.3, 'checkpoint': 'model-effort-keys'},
        {'send': DOWN + UP, 'settle': 0.3, 'checkpoint': 'model-navigation'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'high', 'checkpoint': 'model-cancel'},
    ],
    'keyboard-settings-escape-simple': [
        {'wait_for': 'High'},
        {'send': b'/config' + ENTER, 'settle': 1.0, 'checkpoint': 'settings-search'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'Space to change', 'checkpoint': 'settings-search-exit'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'settings-close'},
    ],
    'keyboard-settings-navigation': [
        {'wait_for': 'High'},
        {'send': b'/config' + ENTER, 'settle': 1.0, 'checkpoint': 'settings-search'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'Space to change', 'checkpoint': 'settings-search-exit'},
        {'send': DOWN + b'j' + CTRL_N, 'settle': 0.3, 'checkpoint': 'settings-down-keys'},
        {'send': UP + b'k' + CTRL_P, 'settle': 0.3, 'checkpoint': 'settings-up-keys'},
        {'send': b' ', 'settle': 0.3, 'checkpoint': 'settings-toggle'},
        {'send': ENTER, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'settings-save-close'},
    ],
    'keyboard-help-scroll': [
        {'wait_for': 'High'},
        {'send': b'/help' + ENTER, 'wait_for': 'Start here', 'checkpoint': 'help-open'},
        {'send': PAGE_DOWN + MOUSE_WHEEL_DOWN + CTRL_END, 'settle': 0.4, 'checkpoint': 'help-bottom'},
        {'send': PAGE_UP + MOUSE_WHEEL_UP + CTRL_HOME, 'settle': 0.4, 'checkpoint': 'help-top'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'high', 'checkpoint': 'help-dismiss'},
    ],
    'keyboard-global-shortcuts': [
        {'wait_for': 'High'},
        {'send': CTRL_L, 'settle': 0.4, 'assert_contains': 'high', 'checkpoint': 'redraw'},
        {'send': SHIFT_TAB, 'settle': 0.4, 'checkpoint': 'cycle-mode'},
        {'send': META_P, 'wait_for': 'Select', 'checkpoint': 'meta-p-model'},
        {'send': ESC, 'settle': 0.3},
        {'send': META_O, 'settle': 0.5, 'checkpoint': 'meta-o-fast'},
        {'send': META_T, 'settle': 0.4, 'checkpoint': 'meta-t-thinking'},
        {'send': CTRL_T, 'settle': 0.4, 'checkpoint': 'ctrl-t-todos'},
    ],
    'keyboard-transcript': [
        {'wait_for': 'High'},
        {'send': b'history audit' + ENTER, 'wait_for': 'TUI canary normal-response', 'timeout': 15.0, 'checkpoint': 'response'},
        {'send': CTRL_O, 'settle': 0.5, 'checkpoint': 'transcript-open'},
        {'send': CTRL_E, 'settle': 0.3, 'checkpoint': 'transcript-toggle-all'},
        {'send': b'q', 'settle': 0.4, 'assert_contains': 'TUI canary normal-response', 'checkpoint': 'transcript-exit'},
    ],
    'keyboard-history': [
        {'wait_for': 'High'},
        {'send': b'first history prompt' + ENTER, 'wait_for': 'TUI canary normal-response', 'timeout': 15.0},
        {'send': UP, 'settle': 0.3, 'assert_prompt_contains': 'first history prompt', 'checkpoint': 'history-up'},
        {'send': DOWN, 'settle': 0.3, 'assert_prompt_not_contains': 'first history prompt', 'checkpoint': 'history-down'},
        {'send': CTRL_R, 'settle': 0.5, 'checkpoint': 'history-search'},
        {'send': ESC, 'settle': 0.3, 'checkpoint': 'history-search-exit'},
    ],
    'keyboard-resize-race': [
        {'wait_for': 'High'},
        {'send': b'resize keeps this prompt intact across responsive terminal changes', 'settle': 0.3},
        {'resize': [60, 24], 'assert_contains': 'resize keeps this prompt', 'checkpoint': 'resize-60'},
        {'resize': [120, 40], 'assert_contains': 'resize keeps this prompt', 'checkpoint': 'resize-120'},
        {'resize': [80, 34], 'assert_contains': 'resize keeps this prompt', 'checkpoint': 'resize-80'},
    ],
    'keyboard-rapid-input': [
        {'wait_for': 'High'},
        {
            'send': b'abcdefghijklmnopqrstuvwxyz0123456789' * 4,
            'settle': 0.4,
            'assert_contains': 'abcdefghijklmnopqrstuvwxyz0123456789',
            'assert_not_contains': '�',
            'checkpoint': 'rapid-input',
        },
    ],
    'keyboard-ctrl-d-exit': [
        {'wait_for': 'High'},
        {'send': CTRL_D, 'settle': 0.3},
        {'send': CTRL_D, 'wait_for_exit': True, 'timeout': 15.0, 'checkpoint': 'ctrl-d-exit'},
    ],
})

CORE_SCENARIOS.update({
    'keyboard-multiline': [
        {'wait_for': 'High'},
        {'send': b'line one', 'settle': 0.2},
        {'send': SHIFT_ENTER, 'settle': 0.3, 'checkpoint': 'multiline-break'},
        {'send': b'line two', 'settle': 0.3, 'assert_contains': 'line one', 'checkpoint': 'multiline-input'},
        {'assert_contains': 'line two'},
        {'send': ENTER, 'wait_for': 'TUI canary normal-response', 'timeout': 15.0, 'checkpoint': 'multiline-submit'},
    ],
    'keyboard-stash': [
        {'wait_for': 'High'},
        {'send': b'stash this prompt', 'settle': 0.3, 'assert_prompt_contains': 'stash this prompt'},
        {'send': CTRL_S, 'settle': 0.4, 'assert_prompt_not_contains': 'stash this prompt', 'checkpoint': 'stashed'},
        {'send': CTRL_S, 'settle': 0.4, 'assert_prompt_contains': 'stash this prompt', 'checkpoint': 'unstashed'},
    ],
    'keyboard-undo-kill-yank': [
        {'wait_for': 'High'},
        {'send': b'abc de', 'settle': 0.2},
        {'send': b'f', 'settle': 1.2, 'assert_prompt_contains': 'abc def'},
        {'send': CTRL_UNDERSCORE, 'settle': 0.4, 'assert_prompt_not_contains': 'abc', 'checkpoint': 'undo-group'},
        {'send': b'abc def', 'settle': 0.3, 'assert_prompt_contains': 'abc def'},
        {'send': CTRL_A, 'settle': 0.2},
        {'send': RIGHT + RIGHT + RIGHT + RIGHT, 'settle': 0.3},
        {'send': CTRL_K, 'settle': 0.3, 'assert_prompt_contains': 'abc ', 'assert_prompt_not_contains': 'def', 'checkpoint': 'kill-line-end'},
        {'send': CTRL_Y, 'settle': 0.3, 'assert_prompt_contains': 'abc def', 'checkpoint': 'yank'},
    ],
    'keyboard-external-editor': [
        {'wait_for': 'High'},
        {'send': b'editor keeps this text', 'settle': 0.3},
        {'send': CTRL_G, 'settle': 1.0, 'assert_prompt_contains': 'editor keeps this text', 'checkpoint': 'ctrl-g-editor'},
        {'send': CTRL_X + CTRL_E, 'settle': 1.0, 'assert_prompt_contains': 'editor keeps this text', 'checkpoint': 'ctrl-x-ctrl-e-editor'},
    ],
    'keyboard-escape-clear': [
        {'wait_for': 'High'},
        {'send': b'clear with escape', 'settle': 0.3},
        {'send': ESC, 'settle': 0.3, 'assert_prompt_contains': 'clear with escape', 'checkpoint': 'escape-first'},
        {'send': ESC, 'settle': 0.4, 'assert_prompt_not_contains': 'clear with escape', 'checkpoint': 'escape-second'},
    ],
    'keyboard-ctrl-c-clear': [
        {'wait_for': 'High'},
        {'send': b'clear with control c', 'settle': 0.3},
        {'send': CTRL_C, 'settle': 0.4, 'assert_prompt_not_contains': 'clear with control c', 'checkpoint': 'ctrl-c-clear'},
    ],
    'keyboard-tabs': [
        {'wait_for': 'High'},
        {'send': b'/config' + ENTER, 'settle': 1.0},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'Space to change'},
        {'send': UP, 'settle': 0.3, 'checkpoint': 'tabs-focused'},
        {'send': RIGHT + LEFT, 'settle': 0.4, 'checkpoint': 'tabs-arrow-navigation'},
        {'send': TAB + SHIFT_TAB, 'settle': 0.4, 'checkpoint': 'tabs-tab-navigation'},
        {'send': UP, 'settle': 0.3, 'checkpoint': 'tabs-refocus-header'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'tabs-close'},
    ],
    'keyboard-theme': [
        {'wait_for': 'High'},
        {'send': b'/theme' + ENTER, 'settle': 1.0, 'checkpoint': 'theme-open'},
        {'send': DOWN + UP, 'settle': 0.3, 'checkpoint': 'theme-navigation'},
        {'send': CTRL_T, 'settle': 0.4, 'checkpoint': 'theme-syntax-toggle'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'theme-cancel'},
    ],
    'keyboard-footer': [
        {'wait_for': 'High'},
        {'send': CTRL_T, 'settle': 0.5, 'checkpoint': 'footer-todos'},
        {'send': UP + LEFT + RIGHT + DOWN, 'settle': 0.4, 'checkpoint': 'footer-navigation'},
        {'send': ESC, 'settle': 0.3, 'checkpoint': 'footer-clear-selection'},
    ],
    'keyboard-rewind': [
        {'wait_for': 'High'},
        {'send': b'rewind audit prompt' + ENTER, 'wait_for': 'TUI canary normal-response', 'timeout': 15.0},
        {'send': b'/rewind' + ENTER, 'settle': 1.0, 'checkpoint': 'rewind-open'},
        {'send': DOWN + b'j' + CTRL_N + UP + b'k' + CTRL_P, 'settle': 0.4, 'checkpoint': 'rewind-navigation'},
        {'send': HOME + END, 'settle': 0.3, 'checkpoint': 'rewind-boundaries'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'TUI canary normal-response', 'checkpoint': 'rewind-cancel'},
    ],
    'keyboard-diff': [
        {'wait_for': 'High'},
        {'send': b'/diff' + ENTER, 'settle': 1.2, 'checkpoint': 'diff-open'},
        {'send': DOWN + UP + RIGHT + LEFT, 'settle': 0.4, 'checkpoint': 'diff-navigation'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'diff-cancel'},
    ],
    'keyboard-plugin': [
        {'wait_for': 'High'},
        {'send': b'/plugin' + ENTER, 'settle': 1.2, 'checkpoint': 'plugin-open'},
        {'send': DOWN + UP, 'settle': 0.4, 'checkpoint': 'plugin-navigation'},
        {'send': ESC, 'settle': 0.4, 'assert_contains': 'Plugins', 'checkpoint': 'plugin-back'},
        {'send': ESC, 'settle': 0.5, 'assert_contains': 'high', 'checkpoint': 'plugin-close'},
    ],
})

CORE_SCENARIOS.update({
    'keyboard-chat-chords': [
        {'wait_for': 'High'},
        {'send': CTRL_X, 'settle': 0.15},
        {'send': CTRL_K, 'wait_for': 'No background agents running', 'timeout': 5.0, 'checkpoint': 'kill-agents-none'},
        {'send': CTRL_V, 'wait_for': 'No image found in clipboard', 'timeout': 5.0, 'checkpoint': 'image-paste-empty'},
    ],
    'keyboard-task-background': [
        {'wait_for': 'High'},
        {'send': b'!sleep 3' + ENTER, 'settle': 0.7, 'checkpoint': 'task-running'},
        {'send': CTRL_B, 'settle': 0.7, 'checkpoint': 'task-backgrounded'},
        {'assert_contains': 'high'},
    ],
})
