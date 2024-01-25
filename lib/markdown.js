/** @param {string} comment */
export function cleanupComment(comment) {
    let clean = '';
    let lastChar = '\0';
    let nonspace = true;
    let lf = false;
    for (let i = 2; i < comment.length; i++) {
        const c = comment.charAt(i);
        if (/^\p{White_Space}$/u.test(c)) {
            if (c === '\n') {
                if (lastChar === '\n' && !lf) {
                    clean += '\n\n';
                    lf = true;
                }
                i += 2;
            }
            if (nonspace) clean += ' ';
            nonspace = false;
        } else {
            clean += c;
            nonspace = true;
            lf = false;
        }
        lastChar = c;
    }
    return clean.trim();
}

/** @param {string} markdown */
export function stripMarkdown(markdown) {
    let clean = '';
    let lastChar = '\0';
    let nonspace = true;
    let lf = false;
    for (let i = 2; i < markdown.length; i++) {
        const c = markdown.charAt(i);
        if (/^\p{White_Space}$/u.test(c)) {
            if (c === '\n') {
                if (lastChar === '\n' && !lf) {
                    clean += '\n';
                    lf = true;
                }
            }
            if (nonspace) clean += ' ';
            nonspace = false;
        } else {
            clean += c;
            nonspace = true;
            lf = false;
        }
        lastChar = c;
    }
    return clean.trim();
}
