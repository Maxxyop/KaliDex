fetch("data/tools.json")
  .then(response => response.json())
  .then(data => {
    const categories = Object.keys(data);
    const container = document.getElementById('main');

    categories.forEach(category => {
      const catDiv = document.createElement('div');
      catDiv.innerHTML = `<h2>${category}</h2>`;

      data[category].forEach(tool => {
        const toolDiv = document.createElement('div');
        toolDiv.classList.add('tool-item');

        let commandsHTML = '';
        tool.commands.forEach(cmd => {
          commandsHTML += `
            <div class="command-item">
              <span class="highlight">${cmd.command}</span> - ${cmd.explanation}
            </div>`;
        });

        toolDiv.innerHTML = `
          <h3>${tool.name}</h3>
          <p>${tool.description}</p>
          ${commandsHTML}
        `;

        catDiv.appendChild(toolDiv);
      });

      container.appendChild(catDiv);
    });
  });
