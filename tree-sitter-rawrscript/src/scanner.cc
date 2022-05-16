#include <tree_sitter/parser.h>
extern "C" {

enum TokenType { TEMPLATE_CHARS };

void *tree_sitter_rawrscript_external_scanner_create() { return NULL; }
void tree_sitter_rawrscript_external_scanner_destroy(void *p) {}
unsigned tree_sitter_rawrscript_external_scanner_serialize(void *p, char *buffer) { return 0; }
void tree_sitter_rawrscript_external_scanner_deserialize(void *p, const char *b, unsigned n) {}
void tree_sitter_rawrscript_external_scanner_reset(void *p) {}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static bool scan_template_chars(TSLexer *lexer) {
  lexer->result_symbol = TEMPLATE_CHARS;
  for (bool has_content = false;; has_content = true) {
    lexer->mark_end(lexer);
    switch (lexer->lookahead) {
      case '`':
	return has_content;
      case '\0':
	return false;
      case '$':
	advance(lexer);
	if (lexer->lookahead == '{') return has_content;
	break;
      case '\\':
	return has_content;
      default:
	advance(lexer);
    }
  }
}

bool tree_sitter_rawrscript_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[TEMPLATE_CHARS]) return scan_template_chars(lexer);
  return false;
}
}
