from spacy.matcher import PhraseMatcher
import re

def _build_phrase_matcher(nlp, items_list):
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    for item in items_list:
        patterns = [nlp.make_doc(kw.lower()) for kw in item.get("keywords", [])]
        matcher.add(item["id"], patterns)
    return matcher

def extract_signals(turns: list, nlp, ontology: dict) -> dict:
    """
    E2: Varredura computacional sobre os turnos de áudio parsados.
    Extrai entidades como preços e marcas. Computa métricas de fala e valida checklist base.
    """
    price_pattern = re.compile(r'r\$\s*([\d.,]+)|(\w+\s+reais|\w+\s+mil)', re.IGNORECASE)
    
    competitor_matcher = _build_phrase_matcher(nlp, ontology.get("competitors", []))
    product_matcher = _build_phrase_matcher(nlp, ontology.get("products", []))
    
    entities = {
        "prices": [],
        "products": [],
        "competitors": [],
        "equipment": [],
        "brands": []
    }
    
    for turn in turns:
        doc = nlp(turn.text)
        
        # Extracao de Preços (Regex)
        for match in price_pattern.finditer(turn.text):
            entities["prices"].append({"value": match.group(), "turn_id": turn.turn_index})
            
        # Extracao de Produtos e Equipamentos (SpaCy PhraseMatcher)
        for match_id, start, end in product_matcher(doc):
            rule_id = nlp.vocab.strings[match_id]
            # O product_matcher tem tanto produtos como iterminal/equipamentos. Filtraremos por ID.
            if rule_id in ["iterminal", "visufit", "visuconsult"]:
                entities["equipment"].append(rule_id)
            else:
                entities["products"].append(rule_id)
            
        # Extracao de Concorrentes
        for match_id, start, end in competitor_matcher(doc):
            rule_id = nlp.vocab.strings[match_id]
            entities["competitors"].append(rule_id)
            
        # Entidades NER genericas para Marcas (ORG)
        for ent in doc.ents:
            if ent.label_ in ["ORG", "MISC"]:
                entities["brands"].append(ent.text)
                
    # Remove duplicatas
    entities["products"] = list(set(entities["products"]))
    entities["equipment"] = list(set(entities["equipment"]))
    entities["competitors"] = list(set(entities["competitors"]))
    entities["brands"] = list(set(entities["brands"]))

    # ─── Métricas de Fala ───
    vendor_turns = [t for t in turns if t.role == "VENDEDOR"]
    total_tokens = sum(t.token_count for t in turns)
    vendor_tokens = sum(t.token_count for t in vendor_turns)
    
    metrics = {
        "seller_talk_ratio": vendor_tokens / total_tokens if total_tokens > 0 else 0,
        "client_talk_ratio": 1 - (vendor_tokens / total_tokens) if total_tokens > 0 else 0,
        "open_questions_by_seller": _count_open_questions(vendor_turns, nlp),
        "closed_questions_by_seller": _count_closed_questions(vendor_turns, nlp),
        "interruptions_detected": _detect_interruptions(turns),
    }

    # ─── Checklist Determinístico ───
    checklist_evidence = _match_checklist(turns, ontology.get("checklist", []), nlp)
    
    # ─── Segmentação Lógica ───
    phases = _segment_phases(turns, entities)

    return {"entities": entities, "checklist_evidence": checklist_evidence, "metrics": metrics, "phases": phases}

def _count_open_questions(vendor_turns: list, nlp) -> int:
    """Turnos terminando em ?: + verbo interrogativo = pergunta aberta."""
    count = 0
    interrogative_words = {"qual", "como", "quando", "onde", "quem", "por", "quanto"}
    for turn in vendor_turns:
        if "?" in turn.text:
            doc = nlp(turn.text)
            if len(doc) >= 5:
                starts_with_interrogative = doc[0].text.lower() in interrogative_words
                root = [t for t in doc if t.dep_ == "ROOT"]
                if starts_with_interrogative or (root and root[0].pos_ == "VERB"):
                    count += 1
    return count

def _count_closed_questions(vendor_turns: list, nlp) -> int:
    """Pergunta simples (sim/nao)."""
    count = 0
    for turn in vendor_turns:
        if "?" in turn.text:
            count += 1
    return max(0, count - _count_open_questions(vendor_turns, nlp))

def _detect_interruptions(turns: list) -> int:
    """Simula detecção de interrupção (turnos curtos interceptados)."""
    count = 0
    for i in range(1, len(turns)):
        if len(turns[i].text.split()) <= 4 and turns[i].role != turns[i-1].role:
            if "-" in turns[i].text or "..." in turns[i-1].text:
                count += 1
    return count

def _match_checklist(turns: list, checklist: list, nlp) -> list:
    """Valida deterministicamente apenas os itens que não exigem LLM."""
    evidence = []
    for item in checklist:
        if not item.get("requires_llm", False):
            matcher = _build_phrase_matcher(nlp, [{"id": item["id"], "keywords": item.get("keywords", [])}])
            found = False
            for turn in turns:
                target_roles = item.get("roles", ["VENDEDOR"])
                if turn.role in target_roles:
                    doc = nlp(turn.text)
                    if matcher(doc):
                        evidence.append({
                            "item_key": item["id"],
                            "result": "pass",
                            "source": "DETERMINISTIC",
                            "evidence": turn.text,
                            "turn_id": turn.turn_index,
                            "confidence": 1.0,
                            "weight": item.get("weight", 1)
                        })
                        found = True
                        break
            if not found:
                 evidence.append({
                    "item_key": item["id"],
                    "result": "fail",
                    "source": "DETERMINISTIC",
                    "evidence": "",
                    "turn_id": None,
                    "confidence": 1.0,
                    "weight": item.get("weight", 1)
                })
    return evidence

def _segment_phases(turns: list, entities: dict) -> list:
    """Estimativa de segmentação baseada no fluxo do diálogo."""
    if not turns: return []
    total = len(turns)
    return [
        {"phase_name": "Abertura / Acolhida", "start_turn": 0, "end_turn": max(0, total // 4 - 1)},
        {"phase_name": "Sondagem / Anamnese", "start_turn": total // 4, "end_turn": max(total // 4, total // 2 - 1)},
        {"phase_name": "Apresentação de Produtos", "start_turn": total // 2, "end_turn": max(total // 2, int(total * 0.75) - 1)},
        {"phase_name": "Objeções e Fechamento", "start_turn": int(total * 0.75), "end_turn": total - 1}
    ]
