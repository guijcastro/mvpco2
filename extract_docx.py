import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path, out_file):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for p in tree.iterfind('.//w:p', ns):
                texts = [node.text for node in p.iterfind('.//w:t', ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(paragraphs))
            print(f"Extraction written to {out_file}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) > 2:
        read_docx(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python extract_docx.py <input.docx> <output.txt>")
